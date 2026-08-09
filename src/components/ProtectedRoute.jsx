// ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  if (!user) return <Navigate to="/" replace />;

  const role = String(user.role || "").trim().toLowerCase();

  const ok =
    allowedRoles.includes(role) ||
    allowedRoles.some(
      (allowedRole) =>
        (allowedRole === "pic_toko" || allowedRole === "spv_toko") &&
        role.startsWith(allowedRole)
    );

  return ok ? children : <Navigate to="/dashboard" replace />;
}
