import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { workspaceAPI } from '../services/api';
import toast from 'react-hot-toast';

const WorkspaceContext = createContext();

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const { workspace, updateWorkspace, getAuthHeaders } = useAuth();
  const [assistants, setAssistants] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentAssistant, setCurrentAssistant] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load workspace data
  const loadWorkspaceData = async () => {
    if (!workspace) return;

    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      // Load assistants and conversations in parallel
      const [assistantsResponse, conversationsResponse] = await Promise.all([
        workspaceAPI.getAssistants(workspace.id, headers),
        workspaceAPI.getConversations(workspace.id, headers)
      ]);

      setAssistants(assistantsResponse.data);
      setConversations(conversationsResponse.data);
    } catch (error) {
      console.error('Failed to load workspace data:', error);
      toast.error('Failed to load workspace data');
    } finally {
      setLoading(false);
    }
  };

  // Load data when workspace changes
  useEffect(() => {
    loadWorkspaceData();
  }, [workspace]);

  // Create assistant
  const createAssistant = async (assistantData) => {
    try {
      const headers = getAuthHeaders();
      const response = await workspaceAPI.createAssistant(workspace.id, assistantData, headers);
      const newAssistant = response.data;
      
      setAssistants(prev => [...prev, newAssistant]);
      toast.success('Assistant created successfully!');
      
      return { success: true, assistant: newAssistant };
    } catch (error) {
      console.error('Failed to create assistant:', error);
      const message = error.response?.data?.detail || 'Failed to create assistant';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Update assistant
  const updateAssistant = async (assistantId, updates) => {
    try {
      const headers = getAuthHeaders();
      const response = await workspaceAPI.updateAssistant(workspace.id, assistantId, updates, headers);
      const updatedAssistant = response.data;
      
      setAssistants(prev => 
        prev.map(assistant => 
          assistant.id === assistantId ? updatedAssistant : assistant
        )
      );
      
      // Update current assistant if it's the one being updated
      if (currentAssistant && currentAssistant.id === assistantId) {
        setCurrentAssistant(updatedAssistant);
      }
      
      toast.success('Assistant updated successfully!');
      return { success: true, assistant: updatedAssistant };
    } catch (error) {
      console.error('Failed to update assistant:', error);
      const message = error.response?.data?.detail || 'Failed to update assistant';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Delete assistant
  const deleteAssistant = async (assistantId) => {
    try {
      const headers = getAuthHeaders();
      await workspaceAPI.deleteAssistant(workspace.id, assistantId, headers);
      
      setAssistants(prev => prev.filter(assistant => assistant.id !== assistantId));
      
      // Clear current assistant if it was deleted
      if (currentAssistant && currentAssistant.id === assistantId) {
        setCurrentAssistant(null);
      }
      
      toast.success('Assistant deleted successfully!');
      return { success: true };
    } catch (error) {
      console.error('Failed to delete assistant:', error);
      const message = error.response?.data?.detail || 'Failed to delete assistant';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Create conversation
  const createConversation = async (assistantId, title = 'New Conversation') => {
    try {
      const headers = getAuthHeaders();
      const response = await workspaceAPI.createConversation(workspace.id, {
        assistant_id: assistantId,
        title
      }, headers);
      
      const newConversation = response.data;
      setConversations(prev => [newConversation, ...prev]);
      
      return { success: true, conversation: newConversation };
    } catch (error) {
      console.error('Failed to create conversation:', error);
      const message = error.response?.data?.detail || 'Failed to create conversation';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Update conversation
  const updateConversation = async (conversationId, updates) => {
    try {
      const headers = getAuthHeaders();
      const response = await workspaceAPI.updateConversation(workspace.id, conversationId, updates, headers);
      const updatedConversation = response.data;
      
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? updatedConversation : conv
        )
      );
      
      if (currentConversation && currentConversation.id === conversationId) {
        setCurrentConversation(updatedConversation);
      }
      
      return { success: true, conversation: updatedConversation };
    } catch (error) {
      console.error('Failed to update conversation:', error);
      const message = error.response?.data?.detail || 'Failed to update conversation';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId) => {
    try {
      const headers = getAuthHeaders();
      await workspaceAPI.deleteConversation(workspace.id, conversationId, headers);
      
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      if (currentConversation && currentConversation.id === conversationId) {
        setCurrentConversation(null);
      }
      
      toast.success('Conversation deleted successfully!');
      return { success: true };
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      const message = error.response?.data?.detail || 'Failed to delete conversation';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Get assistant by ID
  const getAssistant = (assistantId) => {
    return assistants.find(assistant => assistant.id === assistantId);
  };

  // Get conversation by ID
  const getConversation = (conversationId) => {
    return conversations.find(conversation => conversation.id === conversationId);
  };

  const value = {
    workspace,
    assistants,
    conversations,
    currentAssistant,
    currentConversation,
    loading,
    setCurrentAssistant,
    setCurrentConversation,
    createAssistant,
    updateAssistant,
    deleteAssistant,
    createConversation,
    updateConversation,
    deleteConversation,
    getAssistant,
    getConversation,
    loadWorkspaceData,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};