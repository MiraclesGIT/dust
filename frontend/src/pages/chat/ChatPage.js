import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaperAirplaneIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { chatAPI, workspaceAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const { workspace, assistants } = useWorkspace();
  
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations
  const loadConversations = async () => {
    if (!workspace) return;
    
    try {
      const headers = getAuthHeaders();
      const response = await workspaceAPI.getConversations(workspace.id, headers);
      setConversations(response.data);
      
      // If no conversation selected but we have conversations, select the first one
      if (!conversationId && response.data.length > 0) {
        navigate(`/chat/${response.data[0].id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    }
  };

  // Load messages for current conversation
  const loadMessages = async (convId) => {
    if (!convId) return;
    
    try {
      setIsLoadingMessages(true);
      const headers = getAuthHeaders();
      const response = await chatAPI.getMessages(convId, headers);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Set current conversation based on URL param
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
        loadMessages(conversationId);
      }
    } else if (!conversationId && conversations.length > 0) {
      // Navigate to first conversation if none selected
      navigate(`/chat/${conversations[0].id}`, { replace: true });
    }
  }, [conversationId, conversations, navigate]);

  // Load initial data
  useEffect(() => {
    loadConversations();
  }, [workspace]);

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentConversation || isLoading) return;

    const messageContent = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      const headers = getAuthHeaders();
      const response = await chatAPI.sendMessage(currentConversation.id, {
        content: messageContent
      }, headers);

      // Add both user and assistant messages to the list
      setMessages(prev => [...prev, response.data.user_message, response.data.assistant_message]);
      
      // Update conversation in list (move to top)
      setConversations(prev => {
        const updated = prev.map(c => 
          c.id === currentConversation.id 
            ? { ...c, updated_at: new Date().toISOString() }
            : c
        );
        return updated.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new conversation
  const createNewConversation = async (assistantId) => {
    if (!workspace || !assistantId) return;

    try {
      setIsLoading(true);
      const headers = getAuthHeaders();
      const assistant = assistants.find(a => a.id === assistantId);
      const response = await workspaceAPI.createConversation(workspace.id, {
        assistant_id: assistantId,
        title: `Chat with ${assistant?.name || 'Assistant'}`
      }, headers);

      const newConversation = response.data;
      setConversations(prev => [newConversation, ...prev]);
      navigate(`/chat/${newConversation.id}`);
      setShowNewConversation(false);
      toast.success('New conversation created!');
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation');
    } finally {
      setIsLoading(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-full">
      {/* Conversations Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
            <button
              onClick={() => setShowNewConversation(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="New Conversation"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No conversations yet.</p>
              <p className="text-sm mt-1">Create your first conversation to get started!</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => navigate(`/chat/${conversation.id}`)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  currentConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {conversation.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(conversation.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <h1 className="text-lg font-semibold text-gray-900">
                    {currentConversation.title}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {assistants.find(a => a.id === currentConversation.assistant_id)?.name || 'AI Assistant'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">Start a conversation by sending a message below.</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-2xl px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                      <div className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
                      }`}>
                        {formatTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-2xl px-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={sendMessage} className="flex space-x-4">
                <div className="flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500 mb-4">Choose a conversation from the sidebar or create a new one.</p>
              <button
                onClick={() => setShowNewConversation(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Start New Conversation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Start New Conversation</h3>
            
            {assistants.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">No assistants available.</p>
                <p className="text-sm text-gray-400 mb-4">Create an assistant first to start chatting.</p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigate('/assistants/create')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Create Assistant
                  </button>
                  <button
                    onClick={() => setShowNewConversation(false)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {assistants.map((assistant) => (
                    <div
                      key={assistant.id}
                      onClick={() => setSelectedAssistant(assistant.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedAssistant === assistant.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h4 className="font-medium text-gray-900">{assistant.name}</h4>
                      {assistant.description && (
                        <p className="text-sm text-gray-500 mt-1">{assistant.description}</p>
                      )}
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {assistant.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {assistant.model}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => selectedAssistant && createNewConversation(selectedAssistant)}
                    disabled={!selectedAssistant || isLoading}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Creating...' : 'Start Conversation'}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewConversation(false);
                      setSelectedAssistant(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;