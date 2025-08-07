import React from 'react';

const WorkspaceSettingsPage = () => {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Workspace Settings</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Workspace Management</h2>
          <p className="text-gray-600 mb-6">
            The workspace settings interface will be implemented in the next phase. It will include:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">General Settings</h3>
              <p className="text-sm text-gray-600">Workspace name, description, and basic configuration options.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Team Management</h3>
              <p className="text-sm text-gray-600">Invite team members, manage roles, and control access permissions.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Billing & Usage</h3>
              <p className="text-sm text-gray-600">View usage statistics, manage subscription, and billing information.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Security & Compliance</h3>
              <p className="text-sm text-gray-600">Configure security policies, data retention, and compliance settings.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSettingsPage;