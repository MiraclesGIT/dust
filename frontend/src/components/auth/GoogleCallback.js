import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const GoogleCallback = () => {
  const { setUser, setWorkspace, setToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      const urlParams = new URLSearchParams(location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        toast.error('Google authentication failed');
        navigate('/login');
        return;
      }

      if (code && state) {
        try {
          // Send the authorization code to our backend
          const response = await fetch(
            `${process.env.REACT_APP_API_BASE_URL}/auth/google/callback?code=${code}&state=${state}`
          );

          if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
              // Store authentication data
              localStorage.setItem('token', data.access_token);
              localStorage.setItem('user', JSON.stringify(data.user));
              localStorage.setItem('workspace', JSON.stringify(data.workspace));
              
              // Update auth context
              setToken(data.access_token);
              setUser(data.user);
              setWorkspace(data.workspace);
              
              toast.success('Successfully signed in with Google!');
              navigate('/dashboard');
            } else {
              throw new Error('Authentication failed');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Authentication failed');
          }
        } catch (error) {
          console.error('Google callback error:', error);
          toast.error('Authentication failed. Please try again.');
          navigate('/login');
        }
      } else {
        toast.error('Invalid authentication response');
        navigate('/login');
      }
    };

    handleGoogleCallback();
  }, [location, navigate, setUser, setWorkspace, setToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl animate-pulse flex items-center justify-center">
            <span className="text-white font-bold text-xl">V</span>
          </div>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing Google authentication...</p>
      </div>
    </div>
  );
};

export default GoogleCallback;