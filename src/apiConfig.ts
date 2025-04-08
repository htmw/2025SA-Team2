import { Amplify } from 'aws-amplify';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';

// Admin emails allowed to access the admin page
const ADMIN_EMAILS = [
  'muturiisaac@outlook.com',
  '8020lux@gmail.com'
];

// Check if the current user is an admin
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    // Check email against allowed admin emails
    const attributes = await fetchUserAttributes();
    if (attributes.email && ADMIN_EMAILS.includes(attributes.email)) {
      return true;
    }
    
    // Also check Cognito groups if available
    const session = await fetchAuthSession();
    const groups = session.tokens?.idToken?.payload['cognito:groups'];
    
    if (Array.isArray(groups) && groups.includes('admin')) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// Configure API endpoints
export function configureAPI() {
  const existingConfig = Amplify.getConfig();
  
  // API Gateway information
  const region = 'us-east-1';
  const apiGatewayId = 'pn5kfzlf3m';
  
  // Real API Gateway URL - the adminActions Lambda is exposed at /admin/listUsers
  const apiEndpoint = `https://${apiGatewayId}.execute-api.${region}.amazonaws.com/dev`;
  
  // Add REST API configuration
  Amplify.configure({
    ...existingConfig,
    API: {
      ...existingConfig.API,
      REST: {
        ...existingConfig.API?.REST,
        api: {
          endpoint: apiEndpoint,
          region
        }
      }
    }
  });
  
  console.log('API Configuration:', Amplify.getConfig().API);
} 