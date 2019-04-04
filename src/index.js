"use strict";

const _ = require("lodash");

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
                .mapValues(
                    deployment =>
                        `ApiGatewayStage${_.upperFirst(
                            deployment.Properties.StageName
                        )}`
                )
                .values();

            // Handles BasePathMapping
            _.mapValues(template.Resources, function(resource, name) {
                if (resource.Type === "AWS::ApiGateway::BasePathMapping") {
                    resource.DependsOn.push(...stages);
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
                    .mapKeys(
                        deployment =>
                            `ApiGatewayStage${_.upperFirst(
                                deployment.Properties.StageName
                            )}`
                    )
                    .value(),

                // Deployments, with the stage name removed (the Stage's DeploymentId property is used instead).
                deployments
                    .mapValues(deployment =>
                        _.omit(deployment, "Properties.StageName")
                    )
                    .value()
            );

            serverless.cli.log("API Gateway stage configuration complete");
        }
    };
};
