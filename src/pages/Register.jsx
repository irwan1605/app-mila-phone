// src/pages/Register.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TOKO_LABELS from "../data/TokoLabels";
import { saveUserOnline, getAllUsersOnce } from "../services/FirebaseService";

export default function Register({ addUser }) {
  const navigate = useNavigate();
  const tokoNames = useMemo(() => Object.values(TOKO_LABELS), []);

  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "pic_toko",
    tokoName: tokoNames[0] || "",
  });

  const [error, setError] = useState("");

  // Mapping Nama Toko → ID
  const NAME_TO_ID = useMemo(() => {
    return Object.fromEntries(
      Object.entries(TOKO_LABELS).map(([id, label]) => [
        label.toUpperCase(),
        Number(id),
      ])
    );
  }, []);

  /* ============================================================
      HANDLE SUBMIT REGISTER → SAVE TO FIREBASE
  ============================================================ */
  const handleSubmit = async () => {
    setError("");

    const { username, password, role, tokoName, name } = form;

    if (!username || !password) {
      setError("Username & Password wajib diisi.");
      return;
    }

    const existingUsers = await getAllUsersOnce();

    if (
      existingUsers.some(
        (u) =>
          (u.username || "").trim().toLowerCase() === username.trim().toLowerCase()
      )
    ) {
      setError("Username sudah digunakan.");
      return;
    }

    let finalRole = role;
    let tokoId = null;

    if (role === "superadmin") {
      finalRole = "superadmin";
      tokoId = null;
    } else {
      // PIC TOKO
      const id = NAME_TO_ID[(tokoName || "").toUpperCase()];
      if (!id) {
        setError("Nama toko tidak valid.");
        return;
      }
      tokoId = id;
      finalRole = `pic_toko${id}`;
    }

    const newUser = {
      username: username.trim(),
      password,
      role: finalRole,
      toko: tokoId,
      tokoId,
      tokoName,
      name: name?.trim() || username.trim(),
    };

    // Simpan ke Firebase Online
    try {
      await saveUserOnline(newUser);
    } catch (err) {
      console.error(err);
      setError("Gagal menyimpan ke server.");
      return;
    }

    if (typeof addUser === "function") addUser(newUser);

    alert("Registrasi berhasil! Silakan login.");
    navigate("/", { replace: true });
  };

  /* ============================================================
      UI — SAMA PERSIS GAYA LOGIN (Modern, Tailwind, Logo)
  ============================================================ */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-6">
          <div className="text-center mb-6">
            <img
              src="/logoMMT.png"
              alt="Logo"
              className="mx-auto h-12 w-12 object-contain"
            />
            <h1 className="mt-3 text-2xl font-bold text-slate-800">
              Registrasi Akun
            </h1>
            <p className="text-slate-500 text-sm">Buat akun baru Anda</p>
          </div>

          {error && (
            <p className="text-red-500 text-center mb-3 font-medium">{error}</p>
          )}

          <div className="space-y-3">
            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Nama Lengkap
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama lengkap"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Username
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Password
              </label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="password"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Role
              </label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value })
                }
              >
                <option value="superadmin">superadmin</option>
                <option value="pic_toko">pic_toko</option>
              </select>
            </div>

            {/* Toko */}
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Toko
              </label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={form.tokoName}
                disabled={form.role === "superadmin"}
                onChange={(e) => setForm({ ...form, tokoName: e.target.value })}
              >
                {tokoNames.map((nama) => (
                  <option key={nama} value={nama}>
                    {nama}
                  </option>
                ))}
              </select>

              {form.role === "superadmin" && (
                <p className="text-[10px] text-gray-500 mt-1">
                  Superadmin tidak terikat toko.
                </p>
              )}
            </div>

            {/* SUBMIT */}
            <button
              onClick={handleSubmit}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-semibold transition shadow-md"
            >
              Daftar
            </button>
          </div>

          {/* Link ke Login */}
          <div className="mt-4 text-center text-sm text-slate-600">
            Sudah punya akun?{" "}
            <a href="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Login
            </a>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          UI konsisten seperti halaman Login
        </p>
      </div>
    </div>
  );
}
