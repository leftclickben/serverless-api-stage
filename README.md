# Serverless API Stage plugin

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/serverless-api-stage.svg)](https://badge.fury.io/js/serverless-api-stage)
[![Build Status](https://travis-ci.org/leftclickben/serverless-api-stage.svg?branch=master)](https://travis-ci.org/leftclickben/serverless-api-stage)

Plugin for the [serverless framework](https://github.com/serverless/serverless) that allows the use of stages with 
defined stage variables and logging configuration, when using the AWS provider.

This is a rewritten plugin with the same functionality provided by two existing plugins:

* https://github.com/svdgraaf/serverless-plugin-stage-variables
* https://github.com/paulSambolin/serverless-enable-api-logs

Namely:

* In addition to the `AWS::APIGateway::Deployment` resource, an `AWS::APIGateway::Stage` resource is also created.
* The stage is linked to the deployment, to replace the `StageName` property of the deployment.
* The stage may have stage variables defined by `custom.stageSettings.Variables` in your `serverless.yml`.
* The stage may have logging and other method properties defined by `custom.stageSettings.MethodSettings` in your 
  `serverless.yml`.
* An `AWS::IAM::Role` resource is created with the correct permissions to write Cloudwatch logs.
* This IAM Role for logs is set in the `AWS::ApiGateway::Account` settings resource.

## Installation

[Install the plugin via npm](https://www.npmjs.com/package/serverless-api-stage).

## Usage Example

```yaml
#...
plugins:
  - serverless-api-stage
#...
custom:
  stageSettings:
    CacheClusterEnabled: true
    CacheClusterSize: '0.5'
    TracingEnabled: Boolean
    Variables:
      foo: bar
      baz: xyzzy
    # MethodSettings:Use this to overwrite above global settings at each method level.
    # Type: List of MethodSetting
    MethodSettings:
    - CacheDataEncrypted: Boolean
      CacheTtlInSeconds: Integer
      CachingEnabled: Boolean
      DataTraceEnabled: Boolean
      HttpMethod: String
      LoggingLevel: String
      MetricsEnabled: Boolean
      ResourcePath: String
      ThrottlingBurstLimit: Integer
      ThrottlingRateLimit: Double
      ...
    - CacheDataEncrypted: Boolean
      CacheTtlInSeconds: Integer
      CachingEnabled: Boolean
      ...
#...
```

The full list of `MethodSettings` available are defined in the 
[AWS CloudFormation documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-apigateway-stage-methodsetting.html).

## Contributors

Please contribute by submitting a [pull request](https://github.com/leftclickben/serverless-api-stage/pulls), or 
raising an [issue](https://github.com/leftclickben/serverless-api-stage/issues).

Code changes or additions should include corresponding unit test changes or additions.  Tests can be run locally using 
`npm test`.

Please don't update the `version` attribute in `package.json`, as multiple changes might be bundled into a single 
release.  Version bumps will be done in separate pull requests at the time of creating the release and publishing
to npm.

## Plugin Roadmap

Due to discussion with contributors, there are some breaking changes to be made to the plugin, namely:

+ Make the `Role` creation optional (and change the default behaviour)
+ Standardise the `LogicalId` of the `ApiGatewayStage` resource
+ Multiple stages

A migration guide will be provided.

See [v2](https://github.com/leftclickben/serverless-api-stage/milestone/1).
