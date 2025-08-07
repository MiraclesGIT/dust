import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated
  const isAuthenticated = !!token && !!user;

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const storedWorkspace = localStorage.getItem('workspace');

      if (storedToken && storedUser && storedWorkspace) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setWorkspace(JSON.parse(storedWorkspace));
          
          // Verify token is still valid by making a test API call
          await authAPI.verify(storedToken);
        } catch (error) {
          console.error('Token verification failed:', error);
          logout();
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await authAPI.login({ email, password });
      
      const { access_token, user: userData, workspace: workspaceData } = response.data;
      
      // Store in localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('workspace', JSON.stringify(workspaceData));
      
      // Update state
      setToken(access_token);
      setUser(userData);
      setWorkspace(workspaceData);
      
      toast.success('Welcome back!');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.detail || 'Login failed. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authAPI.register(userData);
      
      const { access_token, user: newUser, workspace: newWorkspace } = response.data;
      
      // Store in localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('workspace', JSON.stringify(newWorkspace));
      
      // Update state
      setToken(access_token);
      setUser(newUser);
      setWorkspace(newWorkspace);
      
      toast.success('Account created successfully!');
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('workspace');
    
    // Clear state
    setToken(null);
    setUser(null);
    setWorkspace(null);
    
    toast.success('Logged out successfully');
  };

  // Update user data
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Update workspace data
  const updateWorkspace = (updatedWorkspace) => {
    setWorkspace(updatedWorkspace);
    localStorage.setItem('workspace', JSON.stringify(updatedWorkspace));
  };

  // Get auth headers for API requests
  const getAuthHeaders = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const value = {
    user,
    workspace,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    updateWorkspace,
    getAuthHeaders,
    setUser,
    setWorkspace,
    setToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};