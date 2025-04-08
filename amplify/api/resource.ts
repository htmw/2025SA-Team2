import { adminActions } from '../functions/adminActions/resource';

// Export the admin actions function directly
export const apiFunction = adminActions;

// Note: The actual API Gateway will be configured in the backend.ts file using AWS CDK 