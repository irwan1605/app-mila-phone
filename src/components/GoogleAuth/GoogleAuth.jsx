// src/components/GoogleAuth/GoogleAuth.jsx
import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from './AuthContext'; // Pastikan path ini benar

const GoogleAuth = ({ className = '', onAuthChange }) => {
  const { isAuthenticated, userProfile, handleLoginSuccess, handleLoginError, logout, loading } = useAuth();

  React.useEffect(() => {
    if (onAuthChange) {
      onAuthChange(isAuthenticated);
    }
  }, [isAuthenticated, onAuthChange]);

  if (loading) {
    return (
      <div className={`p-2 ${className}`}>
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-700">Loading Google...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isAuthenticated ? (
        <div className="flex items-center space-x-2 bg-green-100 p-2 rounded-md border border-green-200">
          <img
            src={userProfile?.picture}
            alt="Profile"
            className="w-8 h-8 rounded-full"
          />
          <span className="text-sm font-medium text-green-800">
            Halo, {userProfile?.name}!
          </span>
          <button
            onClick={logout}
            className="ml-2 text-sm text-red-600 hover:text-red-800"
          >
            Logout
          </button>
        </div>
      ) : (
        <GoogleLogin
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
          text-align="left" // Contoh properti, sesuaikan jika perlu
          size="large" // 'small', 'medium', 'large'
          shape="rectangular" // 'circle', 'square', 'rectangular'
          theme="outline" // 'outline', 'filled_blue', 'filled_black'
          type="standard" // 'standard', 'icon'
          locale="id" // Untuk bahasa Indonesia
          logo_alignment="left"
        />
      )}
    </div>
  );
};

export default GoogleAuth;