import React, { useState } from 'react';
import { signOut, deleteUser } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

const Settings = () => {
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    try {
      await deleteUser();
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  return (
    <div className="settings-container">
      <h2 className="settings-title">Account Settings</h2>
      
      <div className="settings-content">
        <button 
          className="delete-button"
          onClick={() => setOpenConfirmDialog(true)}
        >
          Delete Account
        </button>
      </div>

      {openConfirmDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Account</h3>
            <div className="modal-content">
              <p>Are you sure you want to delete your account? This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => setOpenConfirmDialog(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-button"
                onClick={handleDeleteAccount}
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

export default Settings;
