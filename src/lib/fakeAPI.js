// src/lib/fakeAPI.js
import { initDummyUsers } from "../data/UserManagementRole";
import db from "../data/database.json";

initDummyUsers();

function randomDelay() {
  return new Promise((res) => setTimeout(res, 300 + Math.random() * 500));
}

/** Hitung total transaksi, qty, omzet dsb dari data toko */
function calculateSummary(records = []) {
  const totalQty = records.reduce((sum, r) => sum + (r.Qty || 0), 0);
  const totalOmzet = records.reduce((sum, r) => sum + (r["Penjualan"] || 0), 0);
  const totalBayar = records.reduce(
    (sum, r) => sum + (r["Jumlah Bayar "] || 0),
    0
  );
  const transaksi = records.length;
  return { totalQty, totalOmzet, totalBayar, transaksi };
}

export const fakeAPI = {
  /** LOGIN & REGISTER */
  async post(url, body) {
    await randomDelay();

    if (url === "/api/auth/login") {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const found = users.find(
        (u) => u.username === body.username && u.password === body.password
      );
      if (!found) throw new Error("Username atau password salah!");
      return { data: found };
    }

    if (url === "/api/auth/register") {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      if (users.some((u) => u.username === body.username))
        throw new Error("Username sudah terdaftar!");
      users.push(body);
      localStorage.setItem("users", JSON.stringify(users));
      return { data: { message: "Registrasi berhasil!" } };
    }

    throw new Error("Endpoint tidak dikenali: " + url);
  },

  /** GET DATA USER */
  async get(url) {
    await randomDelay();

    if (url === "/api/user/list") {
      return {
        data: JSON.parse(localStorage.getItem("users") || "[]"),
      };
    }

    /** Semua data toko dari database.json */
    if (url === "/api/toko/all") {
      return {
        data: Object.keys(db).map((nama, i) => ({
          id: i + 1,
          nama,
          totalTransaksi: db[nama]?.length || 0,
          summary: calculateSummary(db[nama]),
        })),
      };
    }

    /** Detail toko: /api/toko/:nama */
    if (url.startsWith("/api/toko/")) {
      const namaToko = decodeURIComponent(url.split("/").pop());
      const records = db[namaToko];
      if (!records) throw new Error(`Toko ${namaToko} tidak ditemukan.`);
      return {
        data: {
          nama: namaToko,
          transaksi: records,
          ringkasan: calculateSummary(records),
        },
      };
    }

    throw new Error("Endpoint GET tidak ditemukan: " + url);
  },
};
