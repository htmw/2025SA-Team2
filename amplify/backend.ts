import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { adminActions } from './functions/adminActions/resource';
import { RestApi, LambdaIntegration, Cors, AuthorizationType, CognitoUserPoolsAuthorizer } from 'aws-cdk-lib/aws-apigateway';
import { CfnOutput, Duration } from 'aws-cdk-lib';

const backend = defineBackend({
  auth,
  data,
  adminActions
  // API definition is handled separately
});


const userPool = backend.auth.resources.userPool;

const lambdaFunction = backend.adminActions.resources.lambda;


userPool.grant(lambdaFunction, 'cognito-idp:ListUsers');
userPool.grant(lambdaFunction, 'cognito-idp:AdminGetUser');
userPool.grant(lambdaFunction, 'cognito-idp:AdminEnableUser');
userPool.grant(lambdaFunction, 'cognito-idp:AdminDisableUser');
userPool.grant(lambdaFunction, 'cognito-idp:AdminDeleteUser');


backend.adminActions.addEnvironment('USER_POOL_ID', userPool.userPoolId);


const apiStack = backend.createStack('api-stack');
const restApi = new RestApi(apiStack, 'AdminApi', {
  restApiName: 'AdminApi',
  deploy: true,
  deployOptions: {
    stageName: 'dev',
  },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: Cors.DEFAULT_HEADERS,
    exposeHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Headers'],
    maxAge: Duration.seconds(3600)
  },
});

// Create Lambda integration for the admin actions
const lambdaIntegration = new LambdaIntegration(lambdaFunction);

// Create a Cognito User Pool authorizer
const authorizer = new CognitoUserPoolsAuthorizer(apiStack, 'AdminApiAuthorizer', {
  cognitoUserPools: [userPool]
});

// Create admin endpoint with Cognito User Pool authorization
const adminResource = restApi.root.addResource('admin');
const listUsersResource = adminResource.addResource('listUsers');
listUsersResource.addMethod('POST', lambdaIntegration, {
  authorizationType: AuthorizationType.COGNITO,
  authorizer
});

// Add endpoint for updating users (enable, disable, delete)
const updateUserResource = adminResource.addResource('updateUser');
updateUserResource.addMethod('POST', lambdaIntegration, {
  authorizationType: AuthorizationType.COGNITO,
  authorizer
});

// Export the API details for the Amplify configuration
new CfnOutput(apiStack, 'AdminApiEndpoint', {
  value: restApi.url,
  exportName: 'AdminApiEndpoint'
});

new CfnOutput(apiStack, 'AdminApiName', {
  value: restApi.restApiName,
  exportName: 'AdminApiName'
});
