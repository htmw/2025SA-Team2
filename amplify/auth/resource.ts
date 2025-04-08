import { defineAuth } from '@aws-amplify/backend';
import { adminActions } from '../functions/adminActions/resource';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ['admin'],
  
  access: (allow) => [
    allow.resource(adminActions).to([
      'listUsers',
      'getUser',
      'enableUser',
      'disableUser'
    ])
  ]
});