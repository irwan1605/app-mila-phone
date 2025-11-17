// src/data/UserManagementRole.js

// --- Dummy data awal pengguna ---
export const defaultUsers = [
  {
    username: "super",
    password: "super123",
    name: "Super Admin",
    role: "superadmin",
    tokoId: null,
  },
  {
    username: "admin",
    password: "admin123",
    name: "Admin Pusat",
    role: "admin",
    tokoId: null,
  },
  {
    username: "toko1",
    password: "toko123",
    name: "PIC Toko 1",
    role: "pic_toko1",
    tokoId: 1,
  },
  {
    username: "toko2",
    password: "toko123",
    name: "PIC Toko 2",
    role: "pic_toko2",
    tokoId: 2,
  },
  {
    username: "toko3",
    password: "toko123",
    name: "PIC Toko 3",
    role: "pic_toko3",
    tokoId: 3,
  },
];

// --- Inisialisasi data dummy di localStorage ---
export function initDummyUsers() {
  try {
    const existing = JSON.parse(localStorage.getItem("users") || "[]");
    if (!existing || existing.length === 0) {
      localStorage.setItem("users", JSON.stringify(defaultUsers));
      console.log("✅ Dummy users initialized");
    }
  } catch (err) {
    console.error("❌ Failed to initialize dummy users:", err);
  }
}

// --- Default export (tidak wajib tapi aman untuk backward compatibility) ---
export default {
  defaultUsers,
  initDummyUsers,
};
