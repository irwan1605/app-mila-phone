import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import defaultUsersRaw from "../data/UserManagementRole";
import { listenUsers } from "../services/FirebaseService";

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
  const [onlineUsers, setOnlineUsers] = useState([]);

  const defaultUsers = useMemo(() => normalizeDefaultUsers(), []);
  

  // ✅ LISTENER REALTIME FIREBASE USERS
  useEffect(() => {
    const unsub = listenUsers((list) => {
      const data = Array.isArray(list) ? list : [];
      setOnlineUsers(data);
      localStorage.setItem("users", JSON.stringify(data));
    });

    return () => unsub && unsub();
  }, []);

  

  // ✅ PRIORITAS DATA USER:
  // 1. props users dari App.jsx
  // 2. Firebase realtime
  // 3. localStorage
  // 4. default local file
  const users = useMemo(() => {
    if (Array.isArray(usersProp) && usersProp.length) return usersProp;
    if (Array.isArray(onlineUsers) && onlineUsers.length) return onlineUsers;

    try {
      const ls = JSON.parse(localStorage.getItem("users"));
      if (Array.isArray(ls) && ls.length) return ls;
    } catch {}

    return defaultUsers;
  }, [usersProp, onlineUsers, defaultUsers]);

  // ✅ HANDLE LOGIN
  const handleSubmit = (e) => {
    e.preventDefault();

    const u = users.find(
      (x) =>
        (x.username || "").trim().toLowerCase() ===
          username.trim().toLowerCase() &&
        (x.password || "") === password
    );

    if (!u) {
      alert("❌ Username atau password salah.");
      return;
    }

    let role = u.role;
    let tokoId = u.toko;

    // ✅ NORMALISASI ROLE PIC TOKO
    if (String(role).startsWith("pic_toko")) {
      const parsedId = Number(String(role).replace("pic_toko", ""));
      const finalId = parsedId || Number(tokoId);

      if (Number.isFinite(finalId)) {
        role = `pic_toko${finalId}`;
        tokoId = finalId;
      }
    }

    const logged = {
      _key: u._key || u.username, // 🔥 FALLBACK KE USERNAME
      username: u.username,
      name: u.name || u.username,
      role: u.role,
      toko: u.toko,
    };
    
    localStorage.setItem("user", JSON.stringify(logged));
    
    
    if (typeof onLogin === "function") onLogin(logged);

    // ✅ REDIRECT OTOMATIS BERDASARKAN ROLE
    if (role === "superadmin" || role === "admin") {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (role.startsWith("pic_toko") && Number(tokoId)) {
      navigate(`/toko/${tokoId}`, { replace: true });
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('/bg-login-desktop.png')`,
      }}
    >
      <style>
        {`
          @media (max-width: 640px) {
            div[style] {
              background-image: url('/bg-login-mobile.png') !important;
              background-size: cover !important;
              background-position: center !important;
            }
          }
        `}
      </style>

      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-6">
          <div className="text-center mb-6">
            <img src="/logoMMT.png" alt="Logo" className="mx-auto h-12 w-12 object-contain" />
            <h1 className="mt-3 text-2xl font-bold text-slate-800">
              Inventory Pusat
            </h1>
            <p className="text-slate-500 text-sm">
              Silakan masuk ke akun Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Username
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Password
              </label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700
              text-white font-semibold py-2.5 transition shadow-md"
            >
              Masuk
            </button>
          </form>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          Untuk Daftar — Silahkan Hubungi Admin Anda.
        </p>
      </div>
    </div>
  );
}
