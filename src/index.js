"use strict";

const _ = require("lodash");

const stageName = function(stage) {
    return `ApiGatewayStage${_.upperFirst(_.camelCase(stage))}`;
};

module.exports = function(serverless) {
    this.hooks = {
        "before:deploy:deploy": function() {
            serverless.cli.log("Commencing API Gateway stage configuration");

            const logRoleLogicalName = "IamRoleApiGatewayCloudwatchLogRole";
            const stageSettings = serverless.service.custom.stageSettings || {};
            const template =
                serverless.service.provider.compiledCloudFormationTemplate;
            const deployments = _(template.Resources).pickBy(
                resource => resource.Type === "AWS::ApiGateway::Deployment"
            );
            const stages = deployments
                .mapValues(deployment =>
                    stageName(deployment.Properties.StageName)
                )
                .values();

            // Handles BasePathMapping
            _.mapValues(template.Resources, function(resource, name) {
                if (resource.Type === "AWS::ApiGateway::BasePathMapping") {
                    stages.forEach(function(stage) {
                        resource.DependsOn.push(stage);
                    });
                }
                return resource;
            });

            // TODO Handle other resources - ApiKey, UsagePlan, etc
            const methodSettings = [].concat(stageSettings.MethodSettings);
            _.extend(
                template.Resources,
                // Stages, one per deployment.  TODO Support multiple stages?
                deployments
                    .mapValues((deployment, deploymentKey) => ({
                        Type: "AWS::ApiGateway::Stage",
                        Properties: {
                            StageName: deployment.Properties.StageName,
                            Description: `${
                                deployment.Properties.StageName
                            } stage of ${serverless.service.service}`,
                            RestApiId: {
                                Ref: "ApiGatewayRestApi"
                            },
                            DeploymentId: {
                                Ref: deploymentKey
                            },
                            Variables: stageSettings.Variables || {},
                            AccessLogSetting:
                                stageSettings.AccessLogSetting || {},
                            CacheClusterEnabled:
                                stageSettings.CacheClusterEnabled || false,
                            CacheClusterSize:
                                stageSettings.CacheClusterSize || "0.5",
                            ClientCertificateId:
                                stageSettings.ClientCertificateId || undefined,
                            DocumentationVersion:
                                stageSettings.DocumentationVersion || undefined,
                            MethodSettings: methodSettings.map(item =>
                                _.defaults(item || {}, {
                                    DataTraceEnabled: true,
                                    HttpMethod: "*",
                                    ResourcePath: "/*",
                                    MetricsEnabled: false
                                })
                            )
                        }
                    }))
                    .mapKeys(deployment =>
                        stageName(deployment.Properties.StageName)
                    )
                    .value(),

                // Deployments, with the stage name removed (the Stage's DeploymentId property is used instead).
                deployments
                    .mapValues(deployment =>
                        _.omit(deployment, "Properties.StageName")
                    )
                    .value()
            );

            // Sets/Replaces Log Account Role only if explicitly requested by user
            if (stageSettings.CreateLogAccount) {
                _.extend(
                    template.Resources,
                    // Enable logging: IAM role for API Gateway, and API Gateway account settings
                    {
                        [logRoleLogicalName]: {
                            Type: "AWS::IAM::Role",
                            Properties: {
                                AssumeRolePolicyDocument: {
                                    Version: "2012-10-17",
                                    Statement: [
                                        {
                                            Effect: "Allow",
                                            Principal: {
                                                Service: [
                                                    "apigateway.amazonaws.com"
                                                ]
                                            },
                                            Action: ["sts:AssumeRole"]
                                        }
                                    ]
                                },
                                Policies: [
                                    {
                                        PolicyName: {
                                            "Fn::Join": [
                                                "-",
                                                [
                                                    serverless
                                                        .getProvider("aws")
                                                        .getStage(),
                                                    serverless.service.service,
                                                    "apiGatewayLogs"
                                                ]
                                            ]
                                        },
                                        PolicyDocument: {
                                            Version: "2012-10-17",
                                            Statement: [
                                                {
                                                    Effect: "Allow",
                                                    Action: [
                                                        "logs:CreateLogGroup",
                                                        "logs:CreateLogStream",
                                                        "logs:DescribeLogGroups",
                                                        "logs:DescribeLogStreams",
                                                        "logs:PutLogEvents",
                                                        "logs:GetLogEvents",
                                                        "logs:FilterLogEvents"
                                                    ],
                                                    Resource: "*"
                                                }
                                            ]
                                        }
                                    }
                                ],
                                Path: "/",
                                RoleName: {
                                    "Fn::Join": [
                                        "-",
                                        [
                                            serverless.service.service,
                                            serverless
                                                .getProvider("aws")
                                                .getStage(),
                                            serverless
                                                .getProvider("aws")
                                                .getRegion(),
                                            "apiGatewayLogRole"
                                        ]
                                    ]
                                }
                            }
                        },
                        ApiGatewayAccount: {
                            Type: "AWS::ApiGateway::Account",
                            Properties: {
                                CloudWatchRoleArn: {
                                    "Fn::GetAtt": [logRoleLogicalName, "Arn"]
                                }
                            },
                            DependsOn: [logRoleLogicalName]
                        }
                    }
                );
            }

            serverless.cli.log("API Gateway stage configuration complete");
        }
    };
};
