'use strict';

const sinon = require('sinon');

module.exports = (service, stageName, deploymentKey, stageSettings, apiGateway) => ({
    service: {
        service: service,
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
            },
            apiGateway
        },
        custom: {
            stageSettings: stageSettings
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
