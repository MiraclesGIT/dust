import axios from 'axios';

// Get backend URL from environment
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('workspace');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verify: (token) => api.get('/auth/verify', {
    headers: { Authorization: `Bearer ${token}` }
  }),
};

// Workspace API
export const workspaceAPI = {
  // Workspaces
  getWorkspaces: (headers) => api.get('/workspaces', { headers }),
  getWorkspace: (workspaceId, headers) => api.get(`/workspaces/${workspaceId}`, { headers }),
  updateWorkspace: (workspaceId, data, headers) => api.put(`/workspaces/${workspaceId}`, data, { headers }),
  
  // Assistants
  getAssistants: (workspaceId, headers) => api.get(`/workspaces/${workspaceId}/assistants`, { headers }),
  createAssistant: (workspaceId, data, headers) => api.post(`/workspaces/${workspaceId}/assistants`, data, { headers }),
  getAssistant: (workspaceId, assistantId, headers) => api.get(`/workspaces/${workspaceId}/assistants/${assistantId}`, { headers }),
  updateAssistant: (workspaceId, assistantId, data, headers) => api.put(`/workspaces/${workspaceId}/assistants/${assistantId}`, data, { headers }),
  deleteAssistant: (workspaceId, assistantId, headers) => api.delete(`/workspaces/${workspaceId}/assistants/${assistantId}`, { headers }),
  
  // Conversations
  getConversations: (workspaceId, headers) => api.get(`/workspaces/${workspaceId}/conversations`, { headers }),
  createConversation: (workspaceId, data, headers) => api.post(`/workspaces/${workspaceId}/conversations`, data, { headers }),
  getConversation: (workspaceId, conversationId, headers) => api.get(`/workspaces/${workspaceId}/conversations/${conversationId}`, { headers }),
  updateConversation: (workspaceId, conversationId, data, headers) => api.put(`/workspaces/${workspaceId}/conversations/${conversationId}`, data, { headers }),
  deleteConversation: (workspaceId, conversationId, headers) => api.delete(`/workspaces/${workspaceId}/conversations/${conversationId}`, { headers }),
};

// Chat API
export const chatAPI = {
  getMessages: (conversationId, headers) => api.get(`/conversations/${conversationId}/messages`, { headers }),
  sendMessage: (conversationId, data, headers) => api.post(`/conversations/${conversationId}/messages`, data, { headers }),
  deleteMessage: (conversationId, messageId, headers) => api.delete(`/conversations/${conversationId}/messages/${messageId}`, { headers }),
};

// File Upload API
export const fileAPI = {
  uploadFile: (file, headers) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload', formData, {
      headers: {
        ...headers,
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getFileUrl: (fileId, headers) => api.get(`/files/${fileId}/url`, { headers }),
  deleteFile: (fileId, headers) => api.delete(`/files/${fileId}`, { headers }),
};

// Analytics API
export const analyticsAPI = {
  getWorkspaceStats: (workspaceId, headers) => api.get(`/workspaces/${workspaceId}/analytics`, { headers }),
  getAssistantStats: (workspaceId, assistantId, headers) => api.get(`/workspaces/${workspaceId}/assistants/${assistantId}/analytics`, { headers }),
  getUsageData: (workspaceId, timeRange, headers) => api.get(`/workspaces/${workspaceId}/usage`, { params: { time_range: timeRange }, headers }),
};

// Data Connectors API
export const connectorsAPI = {
  getConnectors: (workspaceId, headers) => api.get(`/workspaces/${workspaceId}/connectors`, { headers }),
  createConnector: (workspaceId, data, headers) => api.post(`/workspaces/${workspaceId}/connectors`, data, { headers }),
  updateConnector: (workspaceId, connectorId, data, headers) => api.put(`/workspaces/${workspaceId}/connectors/${connectorId}`, data, { headers }),
  deleteConnector: (workspaceId, connectorId, headers) => api.delete(`/workspaces/${workspaceId}/connectors/${connectorId}`, { headers }),
  syncConnector: (workspaceId, connectorId, headers) => api.post(`/workspaces/${workspaceId}/connectors/${connectorId}/sync`, {}, { headers }),
};

// WebSocket connection for real-time chat
export const createWebSocketConnection = (conversationId, token) => {
  const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8001/ws';
  const wsUrl = `${WS_URL}/${conversationId}?token=${token}`;
  return new WebSocket(wsUrl);
};

// Utility functions
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.detail || error.response.data?.message || 'An error occurred',
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: 'Network error - please check your connection',
      status: 0,
      data: null,
    };
  } else {
    // Something else happened
    return {
      message: error.message || 'An unexpected error occurred',
      status: -1,
      data: null,
    };
  }
};

// Export the configured axios instance for direct use if needed
export default api;