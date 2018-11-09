'use strict';

const sinon = require('sinon');

module.exports = (service, stageName, deploymentKey, stageSettings, enableLogging, logRoleLogicalName) => ({
    service: {
        service,
        provider: {
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
            stageSettings,
            enableLogging,
            logRoleLogicalName
        }
    },
    getProvider: () => ({
      getStage: () => stageName,
      getRegion: () => 'test-region',
    }),
    cli: {
        log: sinon.spy()
    }
});
