# Serverless API Stage plugin

[![Build Status](https://travis-ci.org/leftclickben/serverless-api-stage.svg?branch=master)](https://travis-ci.org/leftclickben/serverless-api-stage)
[![License: MIT](https://camo.githubusercontent.com/d59450139b6d354f15a2252a47b457bb2cc43828/68747470733a2f2f696d672e736869656c64732e696f2f6e706d2f6c2f7365727665726c6573732e737667)](https://github.com/leftclickben/serverless-api-stage#serverless-api-stage-plugin)

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
    Variables:
      foo: bar
      baz: xyzzy
    MethodSettings:
      LoggingLevel: INFO
      # see below...
#...
```

The full list of `MethodSettings` available are defined in the 
[AWS CloudFormation documentation](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-apitgateway-stage-methodsetting.html).

## Contributors

Please contribute by submitting a [pull request](https://github.com/leftclickben/serverless-api-stage/pulls), or 
raising an [issue](https://github.com/leftclickben/serverless-api-stage/issues).

Code changes or additions should include corresponding unit test changes or additions.  Tests can be run locally using 
`npm test`.  This requires global installation of `jshint` and `mocha` (`npm install -g jshint mocha`).
