import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import toast from 'react-hot-toast';

const GoogleWorkspaceIntegration = () => {
  const { getAuthHeaders } = useAuth();
  const { workspace } = useWorkspace();
  const [integrations, setIntegrations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load integrations on component mount
  useEffect(() => {
    if (workspace) {
      loadIntegrations();
    }
  }, [workspace]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/workspaces/${workspace.id}/google/integrations`,
        {
          headers: getAuthHeaders()
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data);
        
        // If we have integrations, load documents
        if (data.length > 0) {
          loadDocuments();
        }
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
      toast.error('Failed to load Google integrations');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/workspaces/${workspace.id}/google/documents`,
        {
          headers: getAuthHeaders()
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const connectGoogleWorkspace = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/google/auth?workspace_id=${workspace.id}`,
        {
          headers: getAuthHeaders()
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.demo_mode) {
          // Handle demo mode for workspace integration
          try {
            const demoResponse = await fetch(
              `${process.env.REACT_APP_API_BASE_URL}/google/workspace/demo?workspace_id=${workspace.id}`,
              {
                method: 'POST',
                headers: getAuthHeaders()
              }
            );
            
            if (demoResponse.ok) {
              const demoResult = await demoResponse.json();
              toast.success('Demo Google Workspace connected! (Simulated integration)');
              loadIntegrations();
            } else {
              const error = await demoResponse.json();
              toast.error(error.detail || 'Failed to create demo integration');
            }
          } catch (demoError) {
            console.error('Demo integration error:', demoError);
            toast.error('Failed to create demo Google Workspace integration');
          }
        } else {
          // Real OAuth flow
          const { auth_url } = data;
          // Open Google OAuth in a new window
          window.open(auth_url, 'google-oauth', 'width=500,height=600');
          
          // Listen for the OAuth completion
          window.addEventListener('message', handleOAuthCallback);
          toast.success('Opening Google authorization...');
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to initiate Google connection');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect to Google Workspace');
    }
  };

  const handleOAuthCallback = (event) => {
    if (event.data.type === 'google-oauth-success') {
      toast.success('Google Workspace connected successfully!');
      loadIntegrations();
      window.removeEventListener('message', handleOAuthCallback);
    }
  };

  const syncGoogleData = async (integrationId) => {
    try {
      setSyncing(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/workspaces/${workspace.id}/google/sync`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ integration_id: integrationId })
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        loadDocuments();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync Google data');
    } finally {
      setSyncing(false);
    }
  };

  const disconnectIntegration = async (integrationId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/workspaces/${workspace.id}/google/integrations/${integrationId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );
      
      if (response.ok) {
        toast.success('Google Workspace disconnected');
        loadIntegrations();
        setDocuments([]);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect Google Workspace');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Integration Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Google Workspace Integration
            </h3>
            <p className="text-gray-600">
              Connect your Google Drive, Docs, Sheets, and Calendar to give your AI assistants 
              access to your data.
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {integrations.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Not Connected</h4>
              <p className="text-gray-600 mb-4">
                Connect your Google Workspace to sync documents and enable AI assistants to access your data.
              </p>
              <button
                onClick={connectGoogleWorkspace}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Connect Google Workspace
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {integration.credentials.google_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {integration.credentials.google_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => syncGoogleData(integration.id)}
                      disabled={syncing}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                    >
                      {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      onClick={() => disconnectIntegration(integration.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Synced Documents */}
      {documents.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Synced Documents ({documents.length})
          </h3>
          
          <div className="space-y-3">
            {documents.slice(0, 10).map((doc) => (
              <div key={doc.id} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  {doc.doc_type === 'document' && (
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  )}
                  {doc.doc_type === 'spreadsheet' && (
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  )}
                  {doc.doc_type === 'presentation' && (
                    <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                  <p className="text-xs text-gray-600 capitalize">{doc.doc_type}</p>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(doc.last_modified).toLocaleDateString()}
                </div>
              </div>
            ))}
            
            {documents.length > 10 && (
              <p className="text-sm text-gray-600 text-center py-2">
                ... and {documents.length - 10} more documents
              </p>
            )}
          </div>
        </div>
      )}

      {/* Integration Benefits */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-900 mb-3">
          What you can do with Google Workspace Integration:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center mt-0.5 mr-3">
              <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Document Analysis</p>
              <p className="text-sm text-blue-700">AI assistants can read and analyze your Google Docs, Sheets, and Slides</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center mt-0.5 mr-3">
              <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Smart Search</p>
              <p className="text-sm text-blue-700">Find information across all your Google Workspace documents</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center mt-0.5 mr-3">
              <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Content Generation</p>
              <p className="text-sm text-blue-700">Create summaries, reports, and insights from your data</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center mt-0.5 mr-3">
              <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Real-time Sync</p>
              <p className="text-sm text-blue-700">Keep your AI assistants updated with the latest changes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleWorkspaceIntegration;