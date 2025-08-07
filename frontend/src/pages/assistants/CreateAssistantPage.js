import React from 'react';
import { Link } from 'react-router-dom';

const CreateAssistantPage = () => {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link to="/assistants" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
            ← Back to Assistants
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Create New Assistant</h1>
          <p className="text-gray-600 mt-1">Build a custom AI assistant for your team</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Assistant Builder</h2>
          <p className="text-gray-600 mb-6">
            The assistant creation form will be implemented in the next phase. It will include:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Basic Configuration</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Assistant name and description</li>
                <li>• Avatar and visual customization</li>
                <li>• AI model selection (GPT-4, Claude, etc.)</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Personality & Behavior</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• System prompt configuration</li>
                <li>• Conversation style settings</li>
                <li>• Response tone and personality</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Data Sources</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Connect to knowledge bases</li>
                <li>• Link external APIs</li>
                <li>• Upload training documents</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Advanced Features</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Custom tools and functions</li>
                <li>• Workflow automation</li>
                <li>• Integration settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAssistantPage;