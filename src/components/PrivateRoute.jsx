import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ component: Component }) => {
  const currentUser = JSON.parse(localStorage.getItem('user')); // Cek user

  return currentUser ? Component : <Navigate to="/login" />;
};

export default PrivateRoute;
