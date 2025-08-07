import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';

// Components
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import LoadingScreen from './components/common/LoadingScreen';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ChatPage from './pages/chat/ChatPage';
import AssistantsPage from './pages/assistants/AssistantsPage';
import CreateAssistantPage from './pages/assistants/CreateAssistantPage';
import EditAssistantPage from './pages/assistants/EditAssistantPage';
import WorkspaceSettingsPage from './pages/workspace/WorkspaceSettingsPage';
import ProfilePage from './pages/profile/ProfilePage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// App Layout with Sidebar
const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
          <div className="pt-16"> {/* Account for fixed navbar */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <WorkspaceProvider>
                  <AppLayout>
                    <DashboardPage />
                  </AppLayout>
                </WorkspaceProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/chat" element={
              <ProtectedRoute>
                <WorkspaceProvider>
                  <AppLayout>
                    <ChatPage />
                  </AppLayout>
                </WorkspaceProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/chat/:conversationId" element={
              <ProtectedRoute>
                <WorkspaceProvider>
                  <AppLayout>
                    <ChatPage />
                  </AppLayout>
                </WorkspaceProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/assistants" element={
              <ProtectedRoute>
                <WorkspaceProvider>
                  <AppLayout>
                    <AssistantsPage />
                  </AppLayout>
                </WorkspaceProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/assistants/create" element={
              <ProtectedRoute>
                <WorkspaceProvider>
                  <AppLayout>
                    <CreateAssistantPage />
                  </AppLayout>
                </WorkspaceProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/assistants/:assistantId/edit" element={
              <ProtectedRoute>
                <WorkspaceProvider>
                  <AppLayout>
                    <EditAssistantPage />
                  </AppLayout>
                </WorkspaceProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/workspace/settings" element={
              <ProtectedRoute>
                <WorkspaceProvider>
                  <AppLayout>
                    <WorkspaceSettingsPage />
                  </AppLayout>
                </WorkspaceProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <WorkspaceProvider>
                  <AppLayout>
                    <ProfilePage />
                  </AppLayout>
                </WorkspaceProvider>
              </ProtectedRoute>
            } />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;