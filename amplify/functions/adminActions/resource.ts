import { defineFunction } from '@aws-amplify/backend';

export const adminActions = defineFunction({
  name: 'adminActions',
  entry: './src/index.ts',
  resourceGroupName: 'auth'  // Assign to the auth stack to break circular dependency
}); 