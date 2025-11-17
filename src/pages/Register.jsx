// src/pages/Register.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TOKO_LABELS from "../data/TokoLabels";

// Mapping Nama Toko → ID
const NAME_TO_ID = Object.fromEntries(
  Object.entries(TOKO_LABELS).map(([id, label]) => [
    label.toUpperCase(),
    Number(id),
  ])
);

export default function Register({ addUser }) {
  // Ambil daftar nama toko
  const tokoNames = useMemo(() => Object.values(TOKO_LABELS), []);

  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "pic_toko", // default
    tokoName: tokoNames[0] || "",
  });

  const [error, setError] = useState("");
  const navigate = useNavigate();

  /* =============================
        SUBMIT REGISTER
  ============================== */
  const handleSubmit = () => {
    setError("");
    const { username, password, role, tokoName, name } = form;

    if (!username || !password) {
      setError("Username & Password wajib diisi.");
      return;
    }

    let finalRole = role;
    let tokoId = null;
    let finalTokoName = "ALL";

    // =============================
    //       SUPERADMIN
    // =============================
    if (role === "superadmin") {
      finalRole = "superadmin";
      tokoId = null;
      finalTokoName = "ALL";
    }

    // =============================
    //            PIC TOKO
    // =============================
    else {
      const id = NAME_TO_ID[(tokoName || "").toUpperCase()];
      if (!id) {
        setError("Nama toko tidak valid. Pastikan sesuai daftar.");
        return;
      }
      tokoId = id;
      finalRole = `pic_toko${id}`;
      finalTokoName = tokoName;
    }

    const newUser = {
      username: username.trim(),
      password,
      role: finalRole,
      toko: tokoId,
      tokoId,
      tokoName: finalTokoName,
      name: name?.trim() || username.trim(),
      nama: name?.trim() || username.trim(),
    };

    // =============================
    //      SIMPAN LOCAL STORAGE
    // =============================
    try {
      const ls = JSON.parse(localStorage.getItem("users")) || [];
      const exists = ls.some(
        (u) =>
          (u.username || "").trim().toLowerCase() ===
          newUser.username.toLowerCase()
      );
      if (exists) {
        setError("Username sudah dipakai.");
        return;
      }
      const updated = [...ls, newUser];
      localStorage.setItem("users", JSON.stringify(updated));
    } catch {
      localStorage.setItem("users", JSON.stringify([newUser]));
    }

    if (typeof addUser === "function") addUser(newUser);

    alert("Registrasi berhasil. Silakan login.");
    navigate("/", { replace: true });
  };

  /* =============================
            UI START
  ============================== */
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-[28rem]">
        <h2 className="text-xl font-bold mb-4 text-center">
          REGISTRASI AKUN MILA PHONE
        </h2>

        {error && <p className="text-red-500 mb-3 text-center">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Nama Lengkap */}
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Nama Lengkap</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nama lengkap"
            />
          </div>

          {/* Username */}
          <div>
            <label className="text-xs text-slate-600">Username</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="username"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs text-slate-600">Password</label>
            <input
              type="password"
              className="w-full border p-2 rounded"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="password"
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-xs text-slate-600">Role</label>
            <select
              className="w-full border p-2 rounded"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="superadmin">Superadmin</option>
              <option value="pic_toko">Pic_Toko</option>
            </select>
          </div>

          {/* Toko */}
          <div>
            <label className="text-xs text-slate-600">Toko</label>
            <select
              className="w-full border p-2 rounded"
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
        </div>

        {/* SUBMIT */}
        <button
          onClick={handleSubmit}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold"
        >
          Daftar
        </button>

        <div className="mt-3 text-center text-sm">
          Sudah punya akun?{" "}
          <a href="/" className="text-blue-600 hover:underline">
            Login
          </a>
        </div>
      </div>
    </div>
  );
}
