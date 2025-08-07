import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, TrashIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { workspaceAPI } from '../../services/api';
import toast from 'react-hot-toast';

const EditAssistantPage = () => {
  const navigate = useNavigate();
  const { assistantId } = useParams();
  const { getAuthHeaders } = useAuth();
  const { workspace } = useWorkspace();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [assistant, setAssistant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'chat',
    model: 'gpt-4',
    system_prompt: '',
    instructions: '',
    avatar_url: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const assistantTypes = [
    { value: 'chat', label: 'Chat Assistant', description: 'General conversation and Q&A' },
    { value: 'workflow', label: 'Workflow Assistant', description: 'Process automation and task management' },
    { value: 'search', label: 'Search Assistant', description: 'Information retrieval and research' },
    { value: 'analysis', label: 'Analysis Assistant', description: 'Data analysis and insights' }
  ];

  const modelOptions = [
    { value: 'gpt-4', label: 'GPT-4', description: 'Most capable, best for complex tasks' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and efficient for most tasks' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', description: 'Anthropic\'s balanced model' }
  ];

  // Load assistant data
  useEffect(() => {
    const loadAssistant = async () => {
      if (!workspace || !assistantId) return;

      try {
        setIsLoading(true);
        const headers = getAuthHeaders();
        const response = await workspaceAPI.getAssistant(workspace.id, assistantId, headers);
        const assistantData = response.data;
        
        setAssistant(assistantData);
        setFormData({
          name: assistantData.name,
          description: assistantData.description || '',
          type: assistantData.type,
          model: assistantData.model,
          system_prompt: assistantData.system_prompt,
          instructions: assistantData.instructions || '',
          avatar_url: assistantData.avatar_url || ''
        });
      } catch (error) {
        console.error('Failed to load assistant:', error);
        toast.error('Failed to load assistant');
        navigate('/assistants');
      } finally {
        setIsLoading(false);
      }
    };

    loadAssistant();
  }, [workspace, assistantId, getAuthHeaders, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workspace || !assistantId) return;

    // Validation
    if (!formData.name.trim()) {
      toast.error('Assistant name is required');
      return;
    }

    try {
      setIsSaving(true);
      const headers = getAuthHeaders();
      await workspaceAPI.updateAssistant(workspace.id, assistantId, formData, headers);
      
      toast.success('Assistant updated successfully!');
    } catch (error) {
      console.error('Failed to update assistant:', error);
      const message = error.response?.data?.detail || 'Failed to update assistant';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workspace || !assistantId) return;

    try {
      const headers = getAuthHeaders();
      await workspaceAPI.deleteAssistant(workspace.id, assistantId, headers);
      
      toast.success('Assistant deleted successfully');
      navigate('/assistants');
    } catch (error) {
      console.error('Failed to delete assistant:', error);
      toast.error('Failed to delete assistant');
    }
  };

  const startChat = async () => {
    if (!workspace || !assistantId) return;

    try {
      const headers = getAuthHeaders();
      const response = await workspaceAPI.createConversation(workspace.id, {
        assistant_id: assistantId,
        title: `Chat with ${formData.name}`
      }, headers);

      navigate(`/chat/${response.data.id}`);
    } catch (error) {
      console.error('Failed to start chat:', error);
      toast.error('Failed to start chat');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-96 mb-8"></div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="h-6 bg-gray-300 rounded w-48 mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-300 rounded w-32"></div>
                <div className="h-10 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-32"></div>
                <div className="h-20 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!assistant) {
    return null;
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/assistants')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Assistants
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit {assistant.name}</h1>
              <p className="text-gray-600 mt-1">Configure your AI assistant's personality and capabilities</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={startChat}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <ChatBubbleLeftIcon className="w-5 h-5" />
                <span>Test Chat</span>
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <TrashIcon className="w-5 h-5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChatBubbleLeftIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{assistant.usage_count || 0}</p>
                <p className="text-gray-600">Conversations</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">Active</p>
                <p className="text-gray-600">Status</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{assistant.model}</p>
                <p className="text-gray-600">AI Model</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Assistant Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Customer Support Bot"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                  Assistant Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {assistantTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {assistantTypes.find(t => t.value === formData.type)?.description}
                </p>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe what this assistant does and how it helps users..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">AI Configuration</h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {modelOptions.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {modelOptions.find(m => m.value === formData.model)?.description}
                </p>
              </div>

              <div>
                <label htmlFor="system_prompt" className="block text-sm font-medium text-gray-700 mb-2">
                  System Prompt *
                </label>
                <textarea
                  id="system_prompt"
                  name="system_prompt"
                  value={formData.system_prompt}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="You are a helpful AI assistant that..."
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                />
                <p className="text-sm text-gray-500 mt-1">
                  This defines the assistant's personality, role, and base behavior. Be specific and clear.
                </p>
              </div>

              <div>
                <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Instructions
                </label>
                <textarea
                  id="instructions"
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Additional guidelines, formatting preferences, or specific behaviors..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Optional additional instructions for fine-tuning the assistant's responses.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/assistants')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !formData.name.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Assistant</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{assistant.name}</strong>? 
              This action cannot be undone and will also delete all conversations with this assistant.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
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

export default EditAssistantPage;