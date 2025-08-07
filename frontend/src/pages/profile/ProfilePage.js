import React from 'react';

const ProfilePage = () => {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Profile Settings</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Profile</h2>
          <p className="text-gray-600 mb-6">
            The profile management interface will be implemented in the next phase. It will include:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Personal Information</h3>
              <p className="text-sm text-gray-600">Update your name, email, avatar, and contact information.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Account Security</h3>
              <p className="text-sm text-gray-600">Change password, enable two-factor authentication, and manage login sessions.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Preferences</h3>
              <p className="text-sm text-gray-600">Customize UI theme, notification settings, and default behaviors.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">API Access</h3>
              <p className="text-sm text-gray-600">Generate and manage API keys for programmatic access to your account.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;