import React from 'react';
import { Link, useParams } from 'react-router-dom';

const EditAssistantPage = () => {
  const { assistantId } = useParams();

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link to="/assistants" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
            ← Back to Assistants
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Assistant</h1>
          <p className="text-gray-600 mt-1">Modify your AI assistant configuration</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Assistant Editor</h2>
          <p className="text-gray-600 mb-6">
            Assistant ID: {assistantId}
          </p>
          <p className="text-gray-600 mb-6">
            The assistant editing interface will be implemented in the next phase. This will allow you to:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Update Configuration</h3>
              <p className="text-sm text-gray-600">Modify name, description, model, and other basic settings.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Refine Behavior</h3>
              <p className="text-sm text-gray-600">Adjust system prompts and conversation style based on usage feedback.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Manage Data Sources</h3>
              <p className="text-sm text-gray-600">Add, remove, or update connected data sources and knowledge bases.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Version Control</h3>
              <p className="text-sm text-gray-600">Track changes and revert to previous assistant configurations.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditAssistantPage;