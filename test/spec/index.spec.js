'use strict';

const ApiStagePlugin = require('../../src/index');

const expect = require('chai').expect;
const sinon = require('sinon');
const mockServerless = require('../mock/serverless');

describe('The `serverless-api-stage` plugin', function () {
    it('Exports a constructor function', function () {
        expect(ApiStagePlugin).to.be.a('function');
    });
    describe('The constructed object', function () {
        let pluginInstance;
        beforeEach(function () {
            pluginInstance = new ApiStagePlugin();
        });
        it('Exposes a `before:deploy:deploy` hook', function () {
            expect(pluginInstance.hooks).to.be.an('object');
            expect(pluginInstance.hooks['before:deploy:deploy']).to.be.a('function');
        });
    });
    describe('With no `stageSettings` custom property', function () {
        let serverless, pluginInstance;
        beforeEach(function () {
            serverless = mockServerless('service', 'testing', 'Deployment');
            pluginInstance = new ApiStagePlugin(serverless);
        });
        describe('When the `before:deploy:deploy` hook is executed', function () {
            beforeEach(function () {
                pluginInstance.hooks['before:deploy:deploy']();
            });
            it('Adds a stage resource to the CloudFormation template with no variables and default settings', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.ApiGatewayStageTesting).to.deep.equal({
                    Type: 'AWS::ApiGateway::Stage',
                    Properties: {
                        StageName: 'testing',
                        Description: 'testing stage of service',
                        RestApiId: {
                            Ref: 'ApiGatewayRestApi'
                        },
                        AccessLogSetting: {},
                        CacheClusterEnabled: false,
                        CacheClusterSize: '0.5',
                        ClientCertificateId: undefined,
                        DocumentationVersion: undefined,
                        DeploymentId: {
                            Ref: 'Deployment'
                        },
                        Variables: {},
                        MethodSettings: [
                            {
                                DataTraceEnabled: true,
                                HttpMethod: '*',
                                ResourcePath: '/*',
                                MetricsEnabled: false
                            }
                        ]
                    }
                });
            });
            it('Removes the `StageName` property of the deployment resource', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.Deployment.Properties.StageName).to.equal(undefined);
            });
            it('Logs messages', function () {
                expect(serverless.cli.log.calledTwice).to.equal(true);
            });
        });
    });
    describe('With a `stageSettings` custom property that specifies `Variables` and `StageSettings`', function () {
        let serverless, pluginInstance;
        beforeEach(function () {
            serverless = mockServerless('service', 'testing', 'Deployment', {
                AccessLogSetting: {
                    DestinationArn: 'test-log-group',
                    Format: 'test-format'
                },
                CacheClusterEnabled: true,
                CacheClusterSize: '1.0',
                ClientCertificateId: undefined,
                DocumentationVersion: undefined,
                Variables: {
                    foo: 'bar'
                },
                MethodSettings: {
                    LoggingLevel: 'INFO',
                    MetricsEnabled: true,
                    HttpMethod: 'GET',
                    CacheTtlInSeconds: 3600,
                    CachingEnabled: true
                }
            });
            pluginInstance = new ApiStagePlugin(serverless);
        });
        describe('When the `before:deploy:deploy` hook is executed', function () {
            beforeEach(function () {
                pluginInstance.hooks['before:deploy:deploy']();
            });
            it('Adds an IAM Role resource to the CloudFormation template', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.IamRoleApiGatewayCloudwatchLogRole).to.deep.equal({
                    Type: 'AWS::IAM::Role',
                    Properties: {
                        AssumeRolePolicyDocument: {
                            Version: '2012-10-17',
                            Statement: [
                                {
                                    Effect: 'Allow',
                                    Principal: {
                                        Service: [
                                            'apigateway.amazonaws.com'
                                        ]
                                    },
                                    Action: [
                                        'sts:AssumeRole'
                                    ]
                                }
                            ]
                        },
                        Policies: [
                            {
                                PolicyName: {
                                    'Fn::Join': [
                                        '-',
                                        [
                                            'testing',
                                            'service',
                                            'apiGatewayLogs'
                                        ]
                                    ]
                                },
                                PolicyDocument: {
                                    Version: '2012-10-17',
                                    Statement: [
                                        {
                                            Effect: 'Allow',
                                            Action: [
                                                'logs:CreateLogGroup',
                                                'logs:CreateLogStream',
                                                'logs:DescribeLogGroups',
                                                'logs:DescribeLogStreams',
                                                'logs:PutLogEvents',
                                                'logs:GetLogEvents',
                                                'logs:FilterLogEvents'
                                            ],
                                            Resource: '*'
                                        }
                                    ]
                                }
                            }
                        ],
                        Path: '/',
                        RoleName: {
                            'Fn::Join': [
                                '-',
                                [
                                    'service',
                                    'testing',
                                    'test-region',
                                    'apiGatewayLogRole'
                                ]
                            ]
                        }
                    }
                });
            });
            it('Adds an API Gateway Account resource to the CloudFormation template', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.ApiGatewayAccount).to.deep.equal({
                    Type: 'AWS::ApiGateway::Account',
                    Properties: {
                        CloudWatchRoleArn: {
                            'Fn::GetAtt': [
                                'IamRoleApiGatewayCloudwatchLogRole',
                                'Arn'
                            ]
                        }
                    },
                    DependsOn: [
                        'IamRoleApiGatewayCloudwatchLogRole'
                    ]
                });
            });
            it('Adds an API Gateway Stage resource to the CloudFormation template with specified variables and settings', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.ApiGatewayStageTesting).to.deep.equal({
                    Type: 'AWS::ApiGateway::Stage',
                    Properties: {
                        StageName: 'testing',
                        Description: 'testing stage of service',
                        RestApiId: {
                            Ref: 'ApiGatewayRestApi'
                        },
                        AccessLogSetting: {
                            DestinationArn: 'test-log-group',
                            Format: 'test-format'
                        },
                        CacheClusterEnabled: true,
                        CacheClusterSize: '1.0',
                        ClientCertificateId: undefined,
                        DocumentationVersion: undefined,
                        DeploymentId: {
                            Ref: 'Deployment'
                        },
                        Variables: {
                            foo: 'bar'
                        },
                        MethodSettings: [
                            {
                                LoggingLevel: 'INFO',
                                CacheTtlInSeconds: 3600,
                                CachingEnabled: true,
                                DataTraceEnabled: true,
                                HttpMethod: 'GET',
                                ResourcePath: '/*',
                                MetricsEnabled: true
                            }
                        ]
                    }
                });
            });
            it('Removes the `StageName` property of the API Gateway Deployment resource', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.Deployment.Properties.StageName).to.equal(undefined);
            });
            it('Logs messages', function () {
                expect(serverless.cli.log.calledTwice).to.equal(true);
            });
        });
    });
    describe('With a `stageSettings` custom property that specifies `ClientCertificateId`', function () {
        let serverless, pluginInstance;
        beforeEach(function () {
            serverless = mockServerless('service', 'testing', 'Deployment', {
                ClientCertificateId: 'id-of-certificate'
            });
            pluginInstance = new ApiStagePlugin(serverless);
        });
        describe('When the `before:deploy:deploy` hook is executed', function () {
            beforeEach(function () {
                pluginInstance.hooks['before:deploy:deploy']();
            });
            it('Adds an IAM Role resource to the CloudFormation template', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.IamRoleApiGatewayCloudwatchLogRole).to.deep.equal({
                    Type: 'AWS::IAM::Role',
                    Properties: {
                        AssumeRolePolicyDocument: {
                            Version: '2012-10-17',
                            Statement: [
                                {
                                    Effect: 'Allow',
                                    Principal: {
                                        Service: [
                                            'apigateway.amazonaws.com'
                                        ]
                                    },
                                    Action: [
                                        'sts:AssumeRole'
                                    ]
                                }
                            ]
                        },
                        Policies: [
                            {
                                PolicyName: {
                                    'Fn::Join': [
                                        '-',
                                        [
                                            'testing',
                                            'service',
                                            'apiGatewayLogs'
                                        ]
                                    ]
                                },
                                PolicyDocument: {
                                    Version: '2012-10-17',
                                    Statement: [
                                        {
                                            Effect: 'Allow',
                                            Action: [
                                                'logs:CreateLogGroup',
                                                'logs:CreateLogStream',
                                                'logs:DescribeLogGroups',
                                                'logs:DescribeLogStreams',
                                                'logs:PutLogEvents',
                                                'logs:GetLogEvents',
                                                'logs:FilterLogEvents'
                                            ],
                                            Resource: '*'
                                        }
                                    ]
                                }
                            }
                        ],
                        Path: '/',
                        RoleName: {
                            'Fn::Join': [
                                '-',
                                [
                                    'service',
                                    'testing',
                                    'test-region',
                                    'apiGatewayLogRole'
                                ]
                            ]
                        }
                    }
                });
            });
            it('Adds an API Gateway Account resource to the CloudFormation template', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.ApiGatewayAccount).to.deep.equal({
                    Type: 'AWS::ApiGateway::Account',
                    Properties: {
                        CloudWatchRoleArn: {
                            'Fn::GetAtt': [
                                'IamRoleApiGatewayCloudwatchLogRole',
                                'Arn'
                            ]
                        }
                    },
                    DependsOn: [
                        'IamRoleApiGatewayCloudwatchLogRole'
                    ]
                });
            });
            it('Adds an API Gateway Stage resource to the CloudFormation template with specified variables and settings', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.ApiGatewayStageTesting).to.deep.equal({
                    Type: 'AWS::ApiGateway::Stage',
                    Properties: {
                        StageName: 'testing',
                        Description: 'testing stage of service',
                        RestApiId: {
                            Ref: 'ApiGatewayRestApi'
                        },
                        AccessLogSetting: {},
                        CacheClusterEnabled: false,
                        CacheClusterSize: '0.5',
                        DeploymentId: {
                            Ref: 'Deployment'
                        },
                        ClientCertificateId: 'id-of-certificate',
                        DocumentationVersion: undefined,
                        Variables: {},
                        MethodSettings: [
                            {
                                DataTraceEnabled: true,
                                HttpMethod: '*',
                                ResourcePath: '/*',
                                MetricsEnabled: false
                            }
                        ]
                    }
                });
            });
            it('Removes the `StageName` property of the API Gateway Deployment resource', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.Deployment.Properties.StageName).to.equal(undefined);
            });
            it('Logs messages', function () {
                expect(serverless.cli.log.calledTwice).to.equal(true);
            });
        });
    });
    describe('With a `stageSettings` custom property that specifies `DocumentationVersion`', function () {
        let serverless, pluginInstance;
        beforeEach(function () {
            serverless = mockServerless('service', 'testing', 'Deployment', {
                DocumentationVersion: 'v1.0.0'
            });
            pluginInstance = new ApiStagePlugin(serverless);
        });
        describe('When the `before:deploy:deploy` hook is executed', function () {
            beforeEach(function () {
                pluginInstance.hooks['before:deploy:deploy']();
            });
            it('Adds an IAM Role resource to the CloudFormation template', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.IamRoleApiGatewayCloudwatchLogRole).to.deep.equal({
                    Type: 'AWS::IAM::Role',
                    Properties: {
                        AssumeRolePolicyDocument: {
                            Version: '2012-10-17',
                            Statement: [
                                {
                                    Effect: 'Allow',
                                    Principal: {
                                        Service: [
                                            'apigateway.amazonaws.com'
                                        ]
                                    },
                                    Action: [
                                        'sts:AssumeRole'
                                    ]
                                }
                            ]
                        },
                        Policies: [
                            {
                                PolicyName: {
                                    'Fn::Join': [
                                        '-',
                                        [
                                            'testing',
                                            'service',
                                            'apiGatewayLogs'
                                        ]
                                    ]
                                },
                                PolicyDocument: {
                                    Version: '2012-10-17',
                                    Statement: [
                                        {
                                            Effect: 'Allow',
                                            Action: [
                                                'logs:CreateLogGroup',
                                                'logs:CreateLogStream',
                                                'logs:DescribeLogGroups',
                                                'logs:DescribeLogStreams',
                                                'logs:PutLogEvents',
                                                'logs:GetLogEvents',
                                                'logs:FilterLogEvents'
                                            ],
                                            Resource: '*'
                                        }
                                    ]
                                }
                            }
                        ],
                        Path: '/',
                        RoleName: {
                            'Fn::Join': [
                                '-',
                                [
                                    'service',
                                    'testing',
                                    'test-region',
                                    'apiGatewayLogRole'
                                ]
                            ]
                        }
                    }
                });
            });
            it('Adds an API Gateway Account resource to the CloudFormation template', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.ApiGatewayAccount).to.deep.equal({
                    Type: 'AWS::ApiGateway::Account',
                    Properties: {
                        CloudWatchRoleArn: {
                            'Fn::GetAtt': [
                                'IamRoleApiGatewayCloudwatchLogRole',
                                'Arn'
                            ]
                        }
                    },
                    DependsOn: [
                        'IamRoleApiGatewayCloudwatchLogRole'
                    ]
                });
            });
            it('Adds an API Gateway Stage resource to the CloudFormation template with specified variables and settings', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.ApiGatewayStageTesting).to.deep.equal({
                    Type: 'AWS::ApiGateway::Stage',
                    Properties: {
                        StageName: 'testing',
                        Description: 'testing stage of service',
                        RestApiId: {
                            Ref: 'ApiGatewayRestApi'
                        },
                        AccessLogSetting: {},
                        CacheClusterEnabled: false,
                        CacheClusterSize: '0.5',
                        DeploymentId: {
                            Ref: 'Deployment'
                        },
                        ClientCertificateId: undefined,
                        DocumentationVersion: 'v1.0.0',
                        Variables: {},
                        MethodSettings: [
                            {
                                DataTraceEnabled: true,
                                HttpMethod: '*',
                                ResourcePath: '/*',
                                MetricsEnabled: false
                            }
                        ]
                    }
                });
            });
            it('Removes the `StageName` property of the API Gateway Deployment resource', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.Deployment.Properties.StageName).to.equal(undefined);
            });
            it('Logs messages', function () {
                expect(serverless.cli.log.calledTwice).to.equal(true);
            });
        });
    });
    describe('Using non default restApiId`', function () {
        let serverless, pluginInstance;
        beforeEach(function () {
            serverless = mockServerless('service', 'testing', 'Deployment', {},  {restApiId: 'foobar'});
            pluginInstance = new ApiStagePlugin(serverless);
        });
        describe('When the `before:deploy:deploy` hook is executed', function () {
            beforeEach(function () {
                pluginInstance.hooks['before:deploy:deploy']();
            });
            it('Adds an API Gateway Stage resource to the CloudFormation template with specified variables and settings', function () {
                expect(serverless.service.provider.compiledCloudFormationTemplate.Resources.ApiGatewayStageTesting.Properties.RestApiId).to.equal(serverless.service.provider.apiGateway.restApiId);
            });
        });
    });
});
