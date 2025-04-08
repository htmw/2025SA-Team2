import { 
  CognitoIdentityProviderClient, 
  ListUsersCommand,
  AdminEnableUserCommand,
  AdminDisableUserCommand,
  AdminDeleteUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { APIGatewayProxyEvent } from 'aws-lambda';

const client = new CognitoIdentityProviderClient();

// Define CORS headers for reuse
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export const handler = async (event: APIGatewayProxyEvent) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  
  try {
    // Parse the request body
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const { action, username } = requestBody;
    
    // Get the User Pool ID from query parameters or body
    const userPoolId = event.queryStringParameters?.userPoolId || requestBody.userPoolId;
    if (!userPoolId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'User Pool ID is required' }),
      };
    }
    
    if (action === 'listUsers') {
      // List users from Cognito
      const command = new ListUsersCommand({
        UserPoolId: userPoolId,
        Limit: 60,
      });
      
      const response = await client.send(command);
      
      // Map the response to a simpler format
      const users = response.Users?.map(user => {
        const attributes: Record<string, string> = {};
        user.Attributes?.forEach(attr => {
          if (attr.Name && attr.Value) {
            attributes[attr.Name] = attr.Value;
          }
        });
        
        return {
          username: user.Username,
          enabled: user.Enabled,
          userStatus: user.UserStatus,
          userCreateDate: user.UserCreateDate?.toISOString(),
          userLastModifiedDate: user.UserLastModifiedDate?.toISOString(),
          email: attributes['email'] || null,
        };
      }) || [];
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ users }),
      };
    } 
    else if (action === 'enableUser') {
      // Check if username is provided
      if (!username) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Username is required' }),
        };
      }
      
      // Enable the user in Cognito
      const command = new AdminEnableUserCommand({
        UserPoolId: userPoolId,
        Username: username,
      });
      
      await client.send(command);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          message: `User ${username} has been successfully enabled`,
          username,
          enabled: true
        }),
      };
    } 
    else if (action === 'disableUser') {
      // Check if username is provided
      if (!username) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Username is required' }),
        };
      }
      
      // Disable the user in Cognito
      const command = new AdminDisableUserCommand({
        UserPoolId: userPoolId,
        Username: username,
      });
      
      await client.send(command);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          message: `User ${username} has been successfully disabled`,
          username,
          enabled: false 
        }),
      };
    } 
    else if (action === 'deleteUser') {
      // Check if username is provided
      if (!username) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Username is required' }),
        };
      }
      
      // Delete the user from Cognito
      const command = new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: username,
      });
      
      await client.send(command);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          message: `User ${username} has been successfully deleted`,
          username
        }),
      };
    }
    
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid action' }),
    };
    
  } catch (error: unknown) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};