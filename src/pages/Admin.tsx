import React, { useState, useEffect } from 'react';
import { fetchUserAttributes, fetchAuthSession } from '@aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { post } from 'aws-amplify/api'; // Re-enable API connectivity for Cognito
import { Amplify } from 'aws-amplify'; // Import Amplify
import type { Schema } from '../../amplify/data/resource';
import './Admin.css';

// Admin emails allowed to access the admin page
const ADMIN_EMAILS = [
  'egasan21@gmail.com',
  '8020lux@gmail.com'
];

// User interface
interface User {
  id?: string;
  username: string;
  email?: string | null;
  enabled?: boolean | null;
  userStatus?: string | null;
  userCreateDate?: string | null;
  userLastModifiedDate?: string | null;
}

// Interface for Cognito ListUsers response
interface CognitoUser {
  username: string;
  email: string | null;
  enabled: boolean;
  userStatus: string;
  userCreateDate: string;
  userLastModifiedDate: string;
}

// Type guard to check if result is an object with an error property
const isErrorObject = (res: unknown): res is { error: string } => {
  return typeof res === 'object' && res !== null && typeof (res as Record<string, unknown>).error === 'string';
};

const Admin: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false);
  
  // Initialize Amplify DataStore client
  const client = generateClient<Schema>();

  // Check if the current user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const userAttributes = await fetchUserAttributes();
        const userEmail = userAttributes.email;
        
        // Session info for debugging
        const session = await fetchAuthSession();
        const groups = session.tokens?.idToken?.payload['cognito:groups'] || [];
        console.log('User groups:', groups);
        console.log('User attributes:', userAttributes);
        
        // Check admin status by email
        const isAdminByEmail = userEmail && ADMIN_EMAILS.includes(userEmail);
        // Check admin status by group
        const isAdminByGroup = Array.isArray(groups) && groups.includes('admin');
        
        if (isAdminByEmail) {
          console.log('User is admin by email match');
          setIsAdmin(true);
          
          // If admin by email but not in admin group, show warning
          if (!isAdminByGroup) {
            console.warn('User is admin by email but not in Cognito admin group. Data operations may fail.');
            setError('You are recognized as admin by email but not in Cognito admin group. Please contact system administrator to add you to the admin group.');
          }
          
          fetchUsersFromCognitoModel(); // Just fetch from our DynamoDB model
        } else if (isAdminByGroup) {
          console.log('User is admin by Cognito group membership');
          setIsAdmin(true);
          fetchUsersFromCognitoModel();
        } else {
          console.log('User is not an admin:', userEmail);
          setIsAdmin(false);
          setError('You do not have permission to access this page');
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin privileges');
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  // Fetch users from our Cognito mirror in DynamoDB
  const fetchUsersFromCognitoModel = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching users from DynamoDB...');
      
      // Check if user is in Cognito admin group
      const session = await fetchAuthSession();
      const groups = session.tokens?.idToken?.payload['cognito:groups'] || [];
      const isInAdminGroup = Array.isArray(groups) && groups.includes('admin');
      
      // If not in admin group but in ADMIN_EMAILS, bypass DynamoDB fetch and go directly to sync
      if (!isInAdminGroup) {
        console.log('User not in Cognito admin group - bypassing DynamoDB fetch');
        setLoading(false);
        setError('You need to be in the Cognito admin group to access the database. Click "Sync with Cognito" to fetch users directly from Cognito.');
        return;
      }
      
      // This uses the CognitoUser model defined in amplify/data/resource.ts
      // Only admin groups have access to it as defined in the schema
      const response = await client.models.CognitoUser.list();
      
      console.log('DynamoDB response:', response);
      
      if (response.errors && response.errors.length > 0) {
        console.error('DynamoDB access error:', response.errors);
        setError(`Database access error: ${response.errors[0].message || 'Permission denied'}`);
      } else if (response.data.length === 0) {
        console.log('No users found in database');
        setError('No users found in the database. Use the Sync button to import users from Cognito.');
      } else {
        const userData = response.data
          .filter(item => item.username !== '_lastSyncTime')
          .map(item => ({
            id: item.id,
            username: item.username,
            email: item.email || '',
            enabled: item.enabled ?? undefined,
            userStatus: item.userStatus ?? undefined,
            userCreateDate: item.userCreateDate ?? undefined,
            userLastModifiedDate: item.userLastModifiedDate ?? undefined
          }));
          
        console.log('Filtered user data:', userData.length, 'users');
        setUsers(userData);
        setFilteredUsers(userData);
      }
    } catch (err) {
      console.error('Error fetching users from DynamoDB:', err);
      setError('Failed to fetch users from database. Click "Sync with Cognito" to fetch users directly.');
    } finally {
      setLoading(false);
    }
  };

  // Sync users from Cognito to DynamoDB using the real AWS Lambda function
  const syncCognitoUsersToDynamoDB = async () => {
    try {
      setSyncInProgress(true);
      setError(null);
      
      console.log('Attempting to sync with Cognito via Lambda function');
      
      // Get the current auth session to include the token
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      const groups = session.tokens?.idToken?.payload['cognito:groups'] || [];
      const isInAdminGroup = Array.isArray(groups) && groups.includes('admin');
      
      if (!token) {
        throw new Error('Not authenticated - no token available');
      }
      
      // Get userPoolId from Amplify config
      const amplifyConfig = Amplify.getConfig();
      // Try accessing via the Cognito specific config path
      const userPoolId = amplifyConfig.Auth?.Cognito?.userPoolId;
      if (!userPoolId) {
        throw new Error('User Pool ID not found in Amplify configuration.');
      }
      
      // Call the actual Lambda function through API Gateway
      const restOperation = post({
        apiName: 'api',
        path: '/admin/listUsers',
        options: {
          body: { 
            action: 'listUsers',
            userPoolId: userPoolId
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      });
      
      const response = await restOperation.response;
      
      if (!response || !response.body) {
        throw new Error('Empty response from API');
      }
      
      // Parse the response body
      const result = await response.body.json() as unknown as { users: CognitoUser[] };
      
      if (!result || !result.users || !Array.isArray(result.users)) {
        throw new Error('Invalid response format from Lambda function');
      }
      
      const usersToSync = result.users;
      console.log('Successfully fetched users from Cognito:', usersToSync.length);
      console.log('Users from Cognito:', usersToSync);
      
      // If not in admin group, we can't save to database but can show in UI
      if (!isInAdminGroup) {
        console.log('User not in admin group, using state-only approach');
        
        // Just update the UI with the fetched users
        const uiUsers = usersToSync.map(user => ({
          username: user.username,
          email: user.email,
          enabled: user.enabled,
          userStatus: user.userStatus,
          userCreateDate: user.userCreateDate,
          userLastModifiedDate: user.userLastModifiedDate
        }));
        
        setUsers(uiUsers);
        setFilteredUsers(uiUsers);
        setError('Users fetched from Cognito (view only mode). To save users to database, you need to be in the Cognito admin group.');
        setSyncInProgress(false);
        return;
      }
      
      // Process users from Cognito
      for (const user of usersToSync) {
        console.log('Processing user:', user.username);
          // Check if user already exists
        const existingUserResponse = await client.models.CognitoUser.list({
            filter: {
              username: {
                eq: user.username
              }
            }
          });
          
        if (existingUserResponse.data.length > 0) {
            // Update existing user
          console.log('Updating existing user:', user.username);
            await client.models.CognitoUser.update({
            id: existingUserResponse.data[0].id,
            enabled: user.enabled,
            userStatus: user.userStatus,
              lastUpdated: new Date().toISOString()
            });
          } else {
            // Create new user
          console.log('Creating new user:', user.username);
          const createResult = await client.models.CognitoUser.create({
              username: user.username,
            email: user.email || null,
            enabled: user.enabled,
            userStatus: user.userStatus,
            userCreateDate: user.userCreateDate,
            userLastModifiedDate: user.userLastModifiedDate,
              lastUpdated: new Date().toISOString()
            });
          console.log('Created user result:', createResult);
          if (createResult.data) {
            console.log('Created user with ID:', createResult.data.id);
          } else if (createResult.errors) {
            console.error('Error creating user:', createResult.errors);
          }
        }
        }
        
        // Set sync timestamp
        const existingSyncTime = await client.models.CognitoUser.list({
          filter: {
            username: {
              eq: '_lastSyncTime'
            }
          }
        });
        
        if (existingSyncTime.data.length > 0) {
          await client.models.CognitoUser.update({
            id: existingSyncTime.data[0].id,
            lastUpdated: new Date().toISOString()
          });
        } else {
          await client.models.CognitoUser.create({
            username: '_lastSyncTime',
            lastUpdated: new Date().toISOString()
          });
        }
        
        // Refresh the user list
      console.log('About to fetch updated user list...');
      await fetchUsersFromCognitoModel(); // Changed to await to ensure it completes
      console.log('User list updated, number of users now:', users.length);
        
        // Show success message
      setError(`Successfully synced ${usersToSync.length} users from Cognito`);
        setTimeout(() => setError(null), 3000);
    
    } catch (err) {
      console.error('Error syncing Cognito users:', err);
      setError('Failed to sync users from Cognito. Please check API Gateway configuration.');
    } finally {
      setSyncInProgress(false);
    }
  };
  
  // Handle search
  useEffect(() => {
    const results = users.filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredUsers(results);
  }, [searchTerm, users]);

  // Handle toggling user activation status
  const toggleUserStatus = async (user: User) => {
    try {
      setUpdatingUser(user.username);
      
      // Check if user is in admin group
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      const groups = session.tokens?.idToken?.payload['cognito:groups'] || [];
      const isInAdminGroup = Array.isArray(groups) && groups.includes('admin');
      
      if (!token) {
        setError('Not authenticated - no token available');
        setUpdatingUser(null);
        return;
      }
      
      // Get userPoolId from Amplify config
      const amplifyConfig = Amplify.getConfig();
      // Try accessing via the Cognito specific config path
      const userPoolId = amplifyConfig.Auth?.Cognito?.userPoolId;
      if (!userPoolId) {
        setError('User Pool ID not found in Amplify configuration.');
        setUpdatingUser(null);
        return;
      }
      
      // Call Cognito API through our Lambda function
      const action = user.enabled ? 'disableUser' : 'enableUser';
      console.log(`Calling Cognito API to ${action}: ${user.username}`);
      
      // Call the Lambda function through API Gateway
      const restOperation = post({
        apiName: 'api',
        path: '/admin/updateUser',
        options: {
          body: { 
            action, 
            username: user.username,
            userPoolId
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      });
      
      const response = await restOperation.response;
      
      if (!response || !response.body) {
        throw new Error('Empty response from API');
      }
      
      // Parse the response
      const result = await response.body.json();
      console.log('API response:', result);
      
      if (isErrorObject(result)) {
        throw new Error(result.error);
      }
      
      // If we also have a database record, update it
      if (user.id && isInAdminGroup) {
        // Update user in our CognitoUser model in DynamoDB
        const newStatus = !user.enabled;
        
        await client.models.CognitoUser.update({
          id: user.id,
          enabled: newStatus,
          userStatus: newStatus ? 'CONFIRMED' : 'DISABLED',
          lastUpdated: new Date().toISOString()
        });
      }
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.username === user.username 
            ? { ...u, enabled: !user.enabled, userStatus: !user.enabled ? 'CONFIRMED' : 'DISABLED' } 
            : u
        )
      );
      
      // Show success message briefly
      setError(`User ${user.username} has been ${!user.enabled ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error('Error updating user status:', err);
      setError('Failed to update user status: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUpdatingUser(null);
    }
  };

  // Handle delete user 
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      // Get auth session for token
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      const groups = session.tokens?.idToken?.payload['cognito:groups'] || [];
      const isInAdminGroup = Array.isArray(groups) && groups.includes('admin');
      
      if (!token) {
        setError('Not authenticated - no token available');
        setShowDeleteModal(false);
        setUserToDelete(null);
        return;
      }
      
      // Get userPoolId from Amplify config
      const amplifyConfig = Amplify.getConfig();
      // Try accessing via the Cognito specific config path
      const userPoolId = amplifyConfig.Auth?.Cognito?.userPoolId;
      if (!userPoolId) {
        setError('User Pool ID not found in Amplify configuration.');
        setShowDeleteModal(false);
        setUserToDelete(null);
        return;
      }
      
      // Call Cognito API through our Lambda function
      console.log(`Calling Cognito API to delete user: ${userToDelete}`);
      
      // Call the Lambda function through API Gateway
      const restOperation = post({
        apiName: 'api',
        path: '/admin/updateUser',
        options: {
          body: { 
            action: 'deleteUser', 
            username: userToDelete,
            userPoolId: userPoolId
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      });
      
      const response = await restOperation.response;
      
      if (!response || !response.body) {
        throw new Error('Empty response from API');
      }
      
      // Parse the response
      const result = await response.body.json();
      console.log('API response:', result);
      
      if (isErrorObject(result)) {
        throw new Error(result.error);
      }
      
      // Find the user by username
      const userToDeleteObj = users.find(user => user.username === userToDelete);
      
      // If we also have a database record, delete it
      if (userToDeleteObj && userToDeleteObj.id && isInAdminGroup) {
        // Delete from our database
        await client.models.CognitoUser.delete({
          id: userToDeleteObj.id
        });
      }
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.filter(user => user.username !== userToDelete)
      );
      setFilteredUsers(prevFilteredUsers => 
        prevFilteredUsers.filter(user => user.username !== userToDelete)
      );
      
      // Show success message
      setError(`User ${userToDelete} has been deleted successfully`);
      setTimeout(() => setError(null), 3000);
      
      // Close the modal
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Show delete confirmation modal
  const confirmDelete = (username: string) => {
    setUserToDelete(username);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div className="admin-container">
        <h1>Admin Panel</h1>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <h1>Admin Panel</h1>
        <div className="error">{error || 'Access denied'}</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h1>Admin Panel</h1>
      
      {error && <div className="message">{error}</div>}
      
      <div className="admin-controls">
        <div className="search-container">
        <input
          type="text"
            placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
        />
        </div>
        
        <button 
          className="primary-button"
          onClick={syncCognitoUsersToDynamoDB}
          disabled={syncInProgress}
          style={{
            padding: '8px 16px',
            backgroundColor: syncInProgress ? '#ccc' : '#3f51b5',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: syncInProgress ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {syncInProgress ? 'Syncing...' : 'Sync Users'}
        </button>
      </div>
      
      {/* Check for Cognito group status */}
      {isAdmin && (() => {
        // For now, use a simple check based on having user IDs
        const hasDbAccess = users.length > 0 && users.some(user => !!user.id);
        
        if (!hasDbAccess) {
          return (
            <div className="warning-banner" style={{ 
              padding: '10px', 
              backgroundColor: '#ffebee', 
              border: '1px solid #f44336',
              marginBottom: '20px', 
              borderRadius: '4px',
              fontWeight: 'bold'
            }}>
              <p>⚠️ <strong>You are not in the Cognito admin group.</strong> You can view users after clicking "Sync Users" but cannot save changes to the database.</p>
              <p>Please ask your administrator to add your user to the Cognito admin group.</p>
            </div>
          );
        }
        return null;
      })()}
      
      {users.length === 0 ? (
        <div className="no-users" style={{
          padding: '40px',
          textAlign: 'center',
          color: '#666',
          fontSize: '16px'
        }}>No users found</div>
      ) : (
        <div className="user-table-container" style={{ overflowX: 'auto' }}>
          <table className="user-table" style={{
            width: '100%',
            borderCollapse: 'collapse',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Username</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Created</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #eee' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id || user.username} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 16px' }}>{user.username}</td>
                  <td style={{ padding: '12px 16px' }}>{user.email || 'N/A'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: user.enabled ? '#e8f5e9' : '#ffebee',
                      color: user.enabled ? '#2e7d32' : '#c62828'
                    }}>
                      {user.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{user.userCreateDate ? new Date(user.userCreateDate).toLocaleDateString() : 'N/A'}</td>
                  <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <button 
                        style={{
                          padding: '6px 12px',
                          backgroundColor: user.enabled ? '#ffebee' : '#e8f5e9',
                          color: user.enabled ? '#c62828' : '#2e7d32',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: updatingUser === user.username ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: updatingUser === user.username ? 0.7 : 1
                        }}
                      onClick={() => toggleUserStatus(user)}
                        disabled={updatingUser === user.username}
                      >
                        {updatingUser === user.username 
                          ? 'Updating...' 
                          : user.enabled 
                            ? 'Deactivate' 
                            : 'Activate'}
                    </button>
                    <button 
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f5f5f5',
                          color: '#333',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      onClick={() => confirmDelete(user.username)}
                    >
                      Delete
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
          
      {/* Delete Confirmation Modal */}
          {showDeleteModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal" style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <h2 style={{ marginTop: 0 }}>Confirm Delete</h2>
            <p>Are you sure you want to delete user <strong>{userToDelete}</strong>?</p>
            <p style={{
              color: '#d32f2f',
              backgroundColor: '#ffebee',
              padding: '8px 12px',
              borderRadius: '4px',
              fontWeight: 'bold'
            }}>This action cannot be undone!</p>
            <div style={{ 
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '20px'
            }}>
              <button 
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                }}
              >
                Cancel
              </button>
              <button 
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
                onClick={handleDeleteUser}
              >
                Delete
              </button>
                </div>
              </div>
            </div>
      )}
    </div>
  );
};

export default Admin;
