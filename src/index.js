import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Pastikan path ini benar
import App from './App'; // Import App dari file App.jsx yang sudah diperbaiki

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* AuthProvider sekarang dibungkus di dalam App.jsx, jadi tidak perlu di sini */}
    <App />
  </React.StrictMode>
);