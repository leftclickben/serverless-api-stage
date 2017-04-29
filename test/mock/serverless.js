'use strict';

const sinon = require('sinon');

module.exports = (service, stageName, deploymentKey, stageSettings) => ({
    service: {
        service: service,
        provider: {
            stage: stageName,
            region: 'test-region',
            compiledCloudFormationTemplate: {
                Resources: {
                    [deploymentKey]: {
                        Type: 'AWS::ApiGateway::Deployment',
                        StageName: 'dev',
                        Properties: {
                            StageName: stageName
                        }
                    }
                }
            }
        },
        custom: {
            stageSettings: stageSettings
        }
    },
    cli: {
        log: sinon.spy()
    }
});
