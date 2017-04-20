'use strict';

const _ = require('lodash');

module.exports = function (serverless) {
    this.hooks = {
        'before:deploy:deploy': function () {
            serverless.cli.log('Commencing API Gateway stage configuration');

            const stageSettings = serverless.service.custom.stageSettings || {};
            const template = serverless.service.provider.compiledCloudFormationTemplate;
            const deployments = _(template.Resources)
                .pickBy((resource) => resource.Type === 'AWS::ApiGateway::Deployment');

            // TODO Handle other resources - ApiKey, BasePathMapping, UsagePlan, etc
            _.extend(template.Resources,
                // Stages, one per deployment.  TODO Support multiple stages?
                deployments
                    .mapValues((deployment, deploymentKey) => ({
                        Type: 'AWS::ApiGateway::Stage',
                        Properties: {
                            StageName: deployment.Properties.StageName,
                            Description: `${deployment.Properties.StageName} stage of ${serverless.service.service}`,
                            RestApiId: {
                                Ref: 'ApiGatewayRestApi'
                            },
                            DeploymentId: {
                                Ref: deploymentKey
                            },
                            Variables: stageSettings.Variables || {},
                            MethodSettings: [
                                _.defaults(
                                    stageSettings.MethodSettings || {},
                                    {
                                        DataTraceEnabled: true,
                                        HttpMethod: '*',
                                        ResourcePath: '/*',
                                        MetricsEnabled: false
                                    }
                                )
                            ]
                        }
                    }))
                    .mapKeys((deployment, deploymentKey) => `ApiGatewayStage${_.upperFirst(deployment.Properties.StageName)}`)
                    .value(),

                // Deployments, with the stage name removed (the Stage's DeploymentId property is used instead).
                deployments
                    .mapValues((deployment) => _.omit(deployment, 'Properties.StageName'))
                    .value()
            );

            serverless.cli.log('API Gateway stage configuration complete');
        }
    };
};
