// ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  if (!user) return <Navigate to="/" replace />;

  const role = user.role || "";

  const ok =
    allowedRoles.includes(role) ||
    (allowedRoles.includes("pic_toko") && role.startsWith("pic_toko"));

  return ok ? children : <Navigate to="/dashboard" replace />;
}
