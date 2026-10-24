import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';

interface ApiStackProps extends cdk.StackProps {
  table: dynamodb.ITable;
  userPoolId: string;
  userPoolClientId: string;
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const commonEnv = {
      TABLE_NAME: props.table.tableName,
      USER_POOL_ID: props.userPoolId,
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    };

    const casesFunction = new lambda.Function(this, 'CasesFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/cases.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
    });

    const donationsFunction = new lambda.Function(this, 'DonationsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/donations.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
    });

    const usersFunction = new lambda.Function(this, 'UsersFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/users.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(20),
      memorySize: 256,
    });

    const auditFunction = new lambda.Function(this, 'AuditFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/audit.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
    });

    props.table.grantReadWriteData(casesFunction);
    props.table.grantReadWriteData(donationsFunction);
    props.table.grantReadWriteData(usersFunction);
    props.table.grantReadWriteData(auditFunction);

    usersFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminSetUserPassword',
          'cognito-idp:AdminUpdateUserAttributes',
          'cognito-idp:AdminDisableUser',
          'cognito-idp:AdminEnableUser',
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminDeleteUser',
        ],
        resources: [
          `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${props.userPoolId}`,
        ],
      })
    );

    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer(
      'ServeHubJwtAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${props.userPoolId}`,
      {
        jwtAudience: [props.userPoolClientId],
      }
    );

    const httpApi = new apigateway.HttpApi(this, 'ServeHubApi', {
      apiName: 'servehub-api',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PATCH,
          apigateway.CorsHttpMethod.DELETE,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'],
      },
    });

    const casesIntegration = new integrations.HttpLambdaIntegration('CasesIntegration', casesFunction);
    const donationsIntegration = new integrations.HttpLambdaIntegration('DonationsIntegration', donationsFunction);
    const usersIntegration = new integrations.HttpLambdaIntegration('UsersIntegration', usersFunction);
    const auditIntegration = new integrations.HttpLambdaIntegration('AuditIntegration', auditFunction);

    httpApi.addRoutes({
      path: '/cases',
      methods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.POST],
      integration: casesIntegration,
      authorizer: jwtAuthorizer,
    });
    httpApi.addRoutes({
      path: '/cases/{caseId}',
      methods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.PATCH],
      integration: casesIntegration,
      authorizer: jwtAuthorizer,
    });
    httpApi.addRoutes({
      path: '/donations',
      methods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.POST],
      integration: donationsIntegration,
      authorizer: jwtAuthorizer,
    });
    httpApi.addRoutes({
      path: '/donations/{donationId}',
      methods: [apigateway.HttpMethod.PATCH],
      integration: donationsIntegration,
      authorizer: jwtAuthorizer,
    });
    httpApi.addRoutes({
      path: '/users',
      methods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.POST],
      integration: usersIntegration,
      authorizer: jwtAuthorizer,
    });
    httpApi.addRoutes({
      path: '/users/{userId}',
      methods: [apigateway.HttpMethod.PATCH, apigateway.HttpMethod.DELETE],
      integration: usersIntegration,
      authorizer: jwtAuthorizer,
    });
    httpApi.addRoutes({
      path: '/audit',
      methods: [apigateway.HttpMethod.GET],
      integration: auditIntegration,
      authorizer: jwtAuthorizer,
    });

    this.apiUrl = httpApi.apiEndpoint;

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
    });
  }
}
