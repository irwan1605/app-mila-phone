import React, { useEffect, useMemo, useState } from "react";
import TOKO_LABELS from "../data/TokoLabels";

// Firebase user functions
import {
  listenUsers,
  saveUserOnline,
  deleteUserOnline,
} from "../services/FirebaseService";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [tokoFilter, setTokoFilter] = useState("ALL");

  const pageSize = 10;
  const [page, setPage] = useState(1);

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "pic_toko",
    toko: "",
    name: "",
  });

  // ================================
  // MODAL EDIT STATE
  // ================================
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    password: "",
    role: "pic_toko",
    toko: "",
    name: "",
  });

  // Realtime listen from Firebase
  useEffect(() => {
    const unsub = listenUsers((list) => {
      setUsers(Array.isArray(list) ? list : []);
    });
    return () => unsub();
  }, []);

  // ================================
  // FILTERING
  // ================================
  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return (Array.isArray(users) ? users : [])
      .filter(
        (u) =>
          (u.username || "").toLowerCase().includes(q) ||
          (u.name || "").toLowerCase().includes(q)
      )
      .filter((u) => {
        if (roleFilter === "ALL") return true;
        if (roleFilter === "superadmin") return u.role === "superadmin";
        if (roleFilter === "pic_toko") return u.role.startsWith("pic_toko");
        return true;
      })
      .filter((u) => {
        if (tokoFilter === "ALL") return true;
        const tokoId = String(tokoFilter);

        if (u.role.startsWith("pic_toko")) {
          const rid = u.role.replace("pic_toko", "");
          return rid === tokoId;
        }

        return String(u.toko) === tokoId;
      });
  }, [search, roleFilter, tokoFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ================================
  // ADD USER
  // ================================
  const addUser = async () => {
    if (!form.username || !form.password) {
      alert("Username & Password wajib diisi.");
      return;
    }

    // Cek duplicate
    if (users.some((u) => u.username === form.username)) {
      alert("Username sudah digunakan.");
      return;
    }

    let role = form.role;
    let toko = form.toko || null;

    if (role === "pic_toko") {
      if (!toko) {
        alert("Pilih toko untuk PIC Toko.");
        return;
      }
      role = `pic_toko${toko}`;
    } else {
      toko = null;
    }

    const newUser = {
      username: form.username,
      password: form.password,
      role,
      toko,
      name: form.name || form.username,
    };

    await saveUserOnline(newUser);

    setForm({
      username: "",
      password: "",
      role: "pic_toko",
      toko: "",
      name: "",
    });

    alert("User berhasil ditambahkan.");
  };

  // ================================
  // DELETE USER
  // ================================
  const handleDelete = async (username) => {
    if (!window.confirm("Hapus user ini?")) return;
    await deleteUserOnline(username);
  };

  // ================================
  // OPEN MODAL EDIT
  // ================================
  const handleEdit = (u) => {
    let role = u.role;
    let toko = u.toko;

    if (role.startsWith("pic_toko")) {
      toko = role.replace("pic_toko", "");
      role = "pic_toko";
    }

    setEditForm({
      username: u.username,
      password: u.password,
      role,
      toko,
      name: u.name,
    });

    setShowModal(true);
  };

  // ================================
  // SAVE EDITED USER
  // ================================
  const updateUser = async () => {
    let role = editForm.role;
    let toko = editForm.toko || null;

    if (role === "pic_toko") {
      if (!toko) {
        alert("Pilih toko untuk PIC Toko.");
        return;
      }
      role = `pic_toko${toko}`;
    } else {
      toko = null;
    }

    const updatedUser = {
      username: editForm.username,
      password: editForm.password,
      role,
      toko,
      name: editForm.name,
    };

    await saveUserOnline(updatedUser);

    setShowModal(false);

    alert("User berhasil diperbarui.");
  };

  // ================================
  // DISPLAY HELPERS
  // ================================
  const displayRole = (role) => {
    if (role === "superadmin") return "Superadmin";
    if (role.startsWith("pic_toko")) {
      const id = role.replace("pic_toko", "");
      return `PIC Toko ${TOKO_LABELS[id]}`;
    }
    return role;
  };

  const displayToko = (role, toko) => {
    if (role.startsWith("pic_toko")) {
      const id = role.replace("pic_toko", "");
      return TOKO_LABELS[id] || "-";
    }
    return toko ? TOKO_LABELS[toko] : "-";
  };

  // ================================
  // UI
  // ================================
  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">User Management</h2>

      {/* FORM TAMBAH USER */}
      <div className="bg-white shadow rounded p-4 grid md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs">Nama Lengkap</label>
          <input
            className="border p-2 rounded w-full"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama"
          />
        </div>

        <div>
          <label className="text-xs">Username</label>
          <input
            className="border p-2 rounded w-full"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="username"
          />
        </div>

        <div>
          <label className="text-xs">Password</label>
          <input
            type="password"
            className="border p-2 rounded w-full"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="password"
          />
        </div>

        <div>
          <label className="text-xs">Role</label>
          <select
            className="border p-2 rounded w-full"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="superadmin">Superadmin</option>
            <option value="pic_toko">PIC Toko</option>
          </select>
        </div>

        {form.role === "pic_toko" && (
          <div>
            <label className="text-xs">Toko</label>
            <select
              className="border p-2 rounded w-full"
              value={form.toko}
              onChange={(e) => setForm({ ...form, toko: e.target.value })}
            >
              <option value="">-- pilih toko --</option>
              {Object.entries(TOKO_LABELS).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="md:col-span-4">
          <button
            onClick={addUser}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Tambah User
          </button>
        </div>
      </div>

      {/* FILTER */}
      <div className="flex gap-3 flex-wrap">
        <input
          className="border p-2 rounded"
          placeholder="Cari user..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          className="border p-2 rounded"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">Semua Role</option>
          <option value="superadmin">Superadmin</option>
          <option value="pic_toko">PIC Toko</option>
        </select>

        <select
          className="border p-2 rounded"
          value={tokoFilter}
          onChange={(e) => {
            setTokoFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">Semua Toko</option>
          {Object.entries(TOKO_LABELS).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white shadow rounded overflow-auto">
        <table className="min-w-[800px] w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Username</th>
              <th className="p-2 text-left">Nama</th>
              <th className="p-2 text-left">Role</th>
              <th className="p-2 text-left">Toko</th>
              <th className="p-2 text-left">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {pageRows.map((u, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.name}</td>
                <td className="p-2">{displayRole(u.role)}</td>
                <td className="p-2">{displayToko(u.role, u.toko)}</td>
                <td className="p-2 flex gap-2">
                  <button
                    className="px-3 py-1 bg-yellow-500 text-white text-sm rounded"
                    onClick={() => handleEdit(u)}
                  >
                    Edit
                  </button>

                  <button
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded"
                    onClick={() => handleDelete(u.username)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}

            {pageRows.length === 0 && (
              <tr>
                <td colSpan="5" className="p-3 text-center text-gray-500">
                  Tidak ada user.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between mt-3">
        <div>
          Halaman {page} / {totalPages}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 border rounded"
          >
            Prev
          </button>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 border rounded"
          >
            Next
          </button>
        </div>
      </div>

      {/* =======================================
          MODAL EDIT USER
      ======================================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Edit User</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs">Nama Lengkap</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-xs">Username</label>
                <input
                  className="border p-2 rounded w-full bg-gray-100"
                  value={editForm.username}
                  readOnly
                />
              </div>

              <div>
                <label className="text-xs">Password</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm({ ...editForm, password: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-xs">Role</label>
                <select
                  className="border p-2 rounded w-full"
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                >
                  <option value="superadmin">Superadmin</option>
                  <option value="pic_toko">PIC Toko</option>
                </select>
              </div>

              {editForm.role === "pic_toko" && (
                <div>
                  <label className="text-xs">Toko</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={editForm.toko}
                    onChange={(e) =>
                      setEditForm({ ...editForm, toko: e.target.value })
                    }
                  >
                    <option value="">-- pilih toko --</option>
                    {Object.entries(TOKO_LABELS).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={updateUser}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* END MODAL */}
    </div>
  );
}
