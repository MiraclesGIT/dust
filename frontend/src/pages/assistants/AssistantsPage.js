import React from 'react';
import { Link } from 'react-router-dom';

const AssistantsPage = () => {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Assistants</h1>
            <p className="text-gray-600 mt-1">Create and manage your AI assistants</p>
          </div>
          <Link
            to="/assistants/create"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Create Assistant
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Assistant Management</h2>
          <p className="text-gray-600 mb-6">
            The assistant management interface will be implemented in the next phase. This page will include:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Assistant Builder</h3>
              <p className="text-sm text-gray-600">Visual interface to create and configure AI assistants with custom personalities and capabilities.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Templates Gallery</h3>
              <p className="text-sm text-gray-600">Pre-built assistant templates for common use cases like customer support, content creation, and analysis.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Performance Analytics</h3>
              <p className="text-sm text-gray-600">Track assistant performance, usage statistics, and user satisfaction metrics.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantsPage;