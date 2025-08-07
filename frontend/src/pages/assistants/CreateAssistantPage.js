import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { workspaceAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CreateAssistantPage = () => {
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const { workspace } = useWorkspace();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'chat',
    model: 'gpt-4',
    system_prompt: 'You are a helpful AI assistant.',
    instructions: '',
    avatar_url: ''
  });

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workspace) return;

    // Validation
    if (!formData.name.trim()) {
      toast.error('Assistant name is required');
      return;
    }

    try {
      setIsLoading(true);
      const headers = getAuthHeaders();
      const response = await workspaceAPI.createAssistant(workspace.id, formData, headers);
      
      toast.success('Assistant created successfully!');
      navigate(`/assistants/${response.data.id}/edit`);
    } catch (error) {
      console.error('Failed to create assistant:', error);
      const message = error.response?.data?.detail || 'Failed to create assistant';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Create AI Assistant</h1>
          <p className="text-gray-600 mt-1">Configure your new AI assistant with custom personality and capabilities</p>
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

          {/* Preview Section */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {formData.name || 'Untitled Assistant'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} • {formData.model}
                  </p>
                </div>
              </div>
              {formData.description && (
                <p className="text-gray-600 text-sm mb-4">{formData.description}</p>
              )}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-1">System Prompt Preview:</p>
                <p className="text-xs text-gray-600 font-mono">
                  {formData.system_prompt || 'You are a helpful AI assistant.'}
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
              disabled={isLoading || !formData.name.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Assistant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAssistantPage;