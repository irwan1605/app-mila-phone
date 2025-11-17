// src/pages/Login.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import defaultUsersRaw from "../data/UserManagementRole";

// Normalisasi default user list
const normalizeDefaultUsers = () => {
  if (Array.isArray(defaultUsersRaw)) return defaultUsersRaw;
  if (defaultUsersRaw && typeof defaultUsersRaw === "object")
    return Object.values(defaultUsersRaw);
  return [];
};

export default function Login({ onLogin, users: usersProp }) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  /* ============================
       LOAD USER LIST
  ============================ */
  const defaultUsers = useMemo(() => normalizeDefaultUsers(), []);

  const users = useMemo(() => {
    // 1. dari props App.jsx
    if (Array.isArray(usersProp) && usersProp.length) return usersProp;

    // 2. dari localStorage
    try {
      const ls = JSON.parse(localStorage.getItem("users"));
      return Array.isArray(ls) && ls.length ? ls : defaultUsers;
    } catch {
      return defaultUsers;
    }
  }, [usersProp, defaultUsers]);

  // selalu simpan user list
  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users));
  }, [users]);

  /* ============================
          SUBMIT LOGIN
  ============================ */
  const handleSubmit = (e) => {
    e.preventDefault();

    const u = users.find(
      (x) =>
        (x.username || "").trim().toLowerCase() === username.trim().toLowerCase() &&
        (x.password || "") === password
    );

    if (!u) {
      alert("Username atau password salah.");
      return;
    }

    // ============================
    // NORMALISASI ROLE DAN TOKO
    // ============================
    let role = u.role;
    let tokoId = u.toko;

    // contoh: role = "pic_toko3"
    if (String(role).startsWith("pic_toko")) {
      const parsed = Number(String(role).replace("pic_toko", ""));
      const finalId = parsed || Number(tokoId);

      if (Number.isFinite(finalId)) {
        tokoId = finalId;
        role = `pic_toko${finalId}`;
      }
    }

    // data user login lengkap
    const logged = {
      username: u.username,
      name: u.name || u.username,
      role,
      toko: tokoId,
    };

    localStorage.setItem("user", JSON.stringify(logged));
    if (typeof onLogin === "function") onLogin(logged);

    // ============================
    // AUTO REDIRECT SESUAI ROLE
    // ============================
    if (role === "superadmin" || role === "admin") {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (role.startsWith("pic_toko") && Number(tokoId)) {
      navigate(`/toko/${tokoId}`, { replace: true });
      return;
    }

    // fallback jika error
    navigate("/dashboard", { replace: true });
  };

  /* ============================
            UI LOGIN
  ============================ */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-6">
          <div className="text-center mb-6">
            <img src="/logoMMT.png" alt="Logo" className="mx-auto h-12 w-12 object-contain" />
            <h1 className="mt-3 text-2xl font-bold text-slate-800">Inventory Pusat</h1>
            <p className="text-slate-500 text-sm">Silakan masuk ke akun Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600">Username</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 transition shadow-md"
            >
              Masuk
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-600">
            Belum punya akun?{" "}
            <Link className="text-indigo-600 hover:text-indigo-700 font-medium" to="/register">
              Daftar
            </Link>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          Versi UI Tailwind — konsisten dengan komponen lain.
        </p>
      </div>
    </div>
  );
}
