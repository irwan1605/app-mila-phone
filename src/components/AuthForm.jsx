// src/components/AuthForm.jsx
import React from "react";
import "./../styles/auth.css";

const AuthForm = ({ title, buttonText, onSubmit, formData, setFormData, showNameField = false }) => {
  return (
    <div className="auth-container">
      <h2>{title}</h2>
      <form onSubmit={onSubmit}>
        {showNameField && (
          <input
            type="text"
            placeholder="Nama Lengkap"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        )}
        <input
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
        <button type="submit">{buttonText}</button>
      </form>
    </div>
  );
};

export default AuthForm;
