import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { workspaceAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AssistantsPage = () => {
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const { workspace, assistants, setAssistants } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, assistant: null });

  // Load assistants
  const loadAssistants = async () => {
    if (!workspace) return;

    try {
      setIsLoading(true);
      const headers = getAuthHeaders();
      const response = await workspaceAPI.getAssistants(workspace.id, headers);
      setAssistants(response.data);
    } catch (error) {
      console.error('Failed to load assistants:', error);
      toast.error('Failed to load assistants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssistants();
  }, [workspace]);

  // Delete assistant
  const handleDeleteAssistant = async (assistantId) => {
    try {
      const headers = getAuthHeaders();
      await workspaceAPI.deleteAssistant(workspace.id, assistantId, headers);
      
      // Remove from local state
      setAssistants(prev => prev.filter(a => a.id !== assistantId));
      setDeleteModal({ show: false, assistant: null });
      toast.success('Assistant deleted successfully');
    } catch (error) {
      console.error('Failed to delete assistant:', error);
      toast.error('Failed to delete assistant');
    }
  };

  // Start chat with assistant
  const startChat = async (assistant) => {
    try {
      const headers = getAuthHeaders();
      const response = await workspaceAPI.createConversation(workspace.id, {
        assistant_id: assistant.id,
        title: `Chat with ${assistant.name}`
      }, headers);

      navigate(`/chat/${response.data.id}`);
    } catch (error) {
      console.error('Failed to start chat:', error);
      toast.error('Failed to start chat');
    }
  };

  // Get assistant type color
  const getTypeColor = (type) => {
    const colors = {
      chat: 'bg-blue-100 text-blue-800',
      workflow: 'bg-green-100 text-green-800',
      search: 'bg-purple-100 text-purple-800',
      analysis: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-96 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="h-6 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded w-20 mb-4"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-gray-300 rounded w-16"></div>
                    <div className="h-8 bg-gray-300 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Assistants</h1>
            <p className="text-gray-600 mt-1">Create and manage your AI assistants</p>
          </div>
          <Link
            to="/assistants/create"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create Assistant</span>
          </Link>
        </div>

        {/* Assistants Grid */}
        {assistants.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assistants yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first AI assistant to get started with automated conversations and tasks.
            </p>
            <Link
              to="/assistants/create"
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Create Your First Assistant</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assistants.map((assistant) => (
              <div key={assistant.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {assistant.name}
                    </h3>
                    {assistant.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {assistant.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => navigate(`/assistants/${assistant.id}/edit`)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteModal({ show: true, assistant })}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Assistant Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(assistant.type)}`}>
                      {assistant.type.charAt(0).toUpperCase() + assistant.type.slice(1)}
                    </span>
                    <span className="text-xs text-gray-500">{assistant.model}</span>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    <div>Created: {formatDate(assistant.created_at)}</div>
                    <div>Usage: {assistant.usage_count || 0} conversations</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => startChat(assistant)}
                    className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                  >
                    <ChatBubbleLeftIcon className="w-4 h-4" />
                    <span>Chat</span>
                  </button>
                  <Link
                    to={`/assistants/${assistant.id}/edit`}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {assistants.length > 0 && (
          <div className="mt-12 bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/assistants/create"
                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-center"
              >
                <div className="text-indigo-600 mb-2">
                  <PlusIcon className="w-8 h-8 mx-auto" />
                </div>
                <h3 className="font-medium text-gray-900">Create New Assistant</h3>
                <p className="text-sm text-gray-500 mt-1">Build a specialized AI assistant for specific tasks</p>
              </Link>
              
              <Link
                to="/chat"
                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-center"
              >
                <div className="text-green-600 mb-2">
                  <ChatBubbleLeftIcon className="w-8 h-8 mx-auto" />
                </div>
                <h3 className="font-medium text-gray-900">Start Chatting</h3>
                <p className="text-sm text-gray-500 mt-1">Begin a conversation with any of your assistants</p>
              </Link>
              
              <Link
                to="/integrations"
                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-center"
              >
                <div className="text-purple-600 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900">Connect Data Sources</h3>
                <p className="text-sm text-gray-500 mt-1">Enhance assistants with external data integrations</p>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Assistant</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteModal.assistant?.name}</strong>? 
              This action cannot be undone and will also delete all conversations with this assistant.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleDeleteAssistant(deleteModal.assistant.id)}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteModal({ show: false, assistant: null })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistantsPage;