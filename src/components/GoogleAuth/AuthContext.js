// src/components/GoogleAuth/AuthContext.js Mila
import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from '@react-oauth/google';
import { gapi } from 'gapi-script';
import { GOOGLE_CONFIG } from '../../utils/googleConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Inisialisasi gapi client
  useEffect(() => {
    const initClient = () => {
      gapi.client.init({
        apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
        clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        discoveryDocs: GOOGLE_CONFIG.discoveryDocs,
        scope: GOOGLE_CONFIG.scopes.join(' '),
      }).then(() => {
        // Cek apakah ada token yang tersimpan
        const storedToken = localStorage.getItem('google_access_token');
        if (storedToken) {
          setAccessToken(storedToken);
          setIsAuthenticated(true);
          // Fetch user profile
          fetchUserProfile(storedToken);
        }
        setLoading(false);
      }).catch(err => {
        console.error('Google API init error:', err);
        setLoading(false);
      });
    };

    gapi.load('client', initClient);
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`
      );
      const profile = await response.json();
      setUserProfile(profile);
    } catch (err) {
      console.error('Profile fetch error:', err);
    }
  };

  const login = () => {
    // This will be handled by the GoogleLogin component
  };

  const handleLoginSuccess = (tokenResponse) => {
    console.log('Google Login Success:', tokenResponse);
    const token = tokenResponse.access_token;
    setAccessToken(token);
    localStorage.setItem('google_access_token', token);
    setIsAuthenticated(true);
    
    // Fetch user profile
    fetchUserProfile(token);
  };

  const handleLoginError = (error) => {
    console.error('Google Login Error:', error);
    setIsAuthenticated(false);
    setAccessToken('');
    localStorage.removeItem('google_access_token');
  };

  const logout = () => {
    googleLogout();
    setAccessToken('');
    localStorage.removeItem('google_access_token');
    setIsAuthenticated(false);
    setUserProfile(null);
    console.log('Google logout successful.');
  };

  const value = {
    isAuthenticated,
    accessToken,
    userProfile,
    loading,
    login,
    logout,
    handleLoginSuccess,
    handleLoginError
  };

  return (
    <AuthContext.Provider value={value}>
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
        {children}
      </GoogleOAuthProvider>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};