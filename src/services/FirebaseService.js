// src/services/FirebaseService.js
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  get,
} from "firebase/database";

/* ===========================================
   FIREBASE CONFIG
=========================================== */
const firebaseConfig = {
  apiKey: "AIzaSyChHAGbs6yBJ04Pe_1XTyDTcWSOW04Yl0M",
  authDomain: "mila-phone-realtime.firebaseapp.com",
  databaseURL:
    "https://mila-phone-realtime-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mila-phone-realtime",
  storageBucket: "mila-phone-realtime.firebasestorage.app",
  messagingSenderId: "283562738302",
  appId: "1:283562738302:web:0238792f8da3a3ffc3ce2f",
};

// Initialize
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

/* ===========================================
   TOKO NAME
=========================================== */
export const getTokoName = async (tokoId) => {
  try {
    const snap = await get(ref(db, `toko/${tokoId}/info/name`));
    return snap.exists() ? snap.val() : `Toko ${tokoId}`;
  } catch (e) {
    console.error("getTokoName error:", e);
    return `Toko ${tokoId}`;
  }
};

/* ===========================================
   USER MANAGEMENT (REALTIME)
=========================================== */

// SAVE USER
export function saveUserOnline(user) {
  return set(ref(db, "users/" + user.username), user);
}

// DELETE USER
export function deleteUserOnline(username) {
  return remove(ref(db, "users/" + username));
}

// LISTEN ALL USERS REALTIME
export function listenUsers(callback) {
  const usersRef = ref(db, "users");
  return onValue(usersRef, (snap) => {
    const val = snap.val() || {};
    const list = Object.values(val);
    callback(list);
  });
}

// GET ALL USERS ON LOGIN
export async function getAllUsersOnce() {
  const snap = await get(ref(db, "users"));
  const val = snap.val() || {};
  return Object.values(val);
}

/* ===========================================
   TRANSAKSI PER TOKO (REALTIME)
=========================================== */

// LISTEN transaksi /toko/{id}/transaksi
export const listenTransaksiByToko = (tokoId, callback) => {
  const trxRef = ref(db, `toko/${tokoId}/transaksi`);
  const unsub = onValue(trxRef, (snap) => {
    const raw = snap.val() || {};
    const list = Object.entries(raw).map(([id, item]) => ({
      id,
      ...item,
    }));
    callback(list);
  });
  return () => unsub && unsub();
};

// ADD transaksi
export const addTransaksi = (tokoId, data) => {
  const newRef = push(ref(db, `toko/${tokoId}/transaksi`));
  return set(newRef, data);
};

// UPDATE transaksi
export const updateTransaksi = (tokoId, id, data) => {
  return update(ref(db, `toko/${tokoId}/transaksi/${id}`), data);
};

// DELETE transaksi
export const deleteTransaksi = (tokoId, id) => {
  return remove(ref(db, `toko/${tokoId}/transaksi/${id}`));
};

/* ===========================================
   LISTEN SEMUA TOKO (Dashboard Pusat)
=========================================== */
export const listenAllTransaksi = (callback) => {
  const r = ref(db, "toko");
  const unsub = onValue(r, (snap) => {
    const raw = snap.val() || {};
    const merged = [];

    Object.entries(raw).forEach(([tokoId, tokoData]) => {
      const tokoName = tokoData.info?.name || `Toko ${tokoId}`;

      if (!tokoData.transaksi) return;

      Object.entries(tokoData.transaksi).forEach(([id, row]) => {
        merged.push({
          id,
          tokoId,
          TOKO: tokoName,

          TANGGAL: row.TANGGAL || "",
          BRAND: row.BRAND || "",
          IMEI: row.IMEI || "",
          NO_MESIN: row.NO_MESIN || "",

          QTY: Number(row.QTY) || 0,
          HARGA: Number(row.HARGA) || 0,

          TOTAL: (Number(row.QTY) || 0) * (Number(row.HARGA) || 0),
          NAMA_SALES: row.NAMA_SALES || "",
        });
      });
    });

    // sort by date desc
    merged.sort((a, b) => {
      const da = a.TANGGAL ? new Date(a.TANGGAL) : new Date(0);
      const dbb = b.TANGGAL ? new Date(b.TANGGAL) : new Date(0);
      return dbb - da;
    });

    callback(merged);
  });

  return () => unsub && unsub();
};
