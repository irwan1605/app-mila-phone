// src/services/FirebaseService.js
import { db } from "../FirebaseInit";
import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  get,
  child,
} from "firebase/database";

/**
 * FirebaseService.js
 * - wrapper kecil untuk Realtime Database (Firebase v9 modular)
 * - semua fungsi mengembalikan Promise (atau unsubscribe function untuk listener)
 *
 * Struktur DB yang diasumsikan (toleran):
 *  /toko/{tokoId}/transaksi/{txId}         -> transaksi per toko (dipakai DashboardToko)
 *  /toko/{tokoId}/info/name                 -> nama toko (fallback)
 *  /dataManagement/tokoLabels/{id}          -> label toko (fallback)
 *
 *  /users/{username}                         -> data user (Login/Register/UserManagement)
 *
 *  /penjualan/{generatedId}                  -> master penjualan (dipakai DataManagement, realtime)
 *
 *  /dataManagement/masterHarga, /dataManagement/masterKatalog, /dataManagement/sales, ...
 *                                            -> master datasets (optional)
 */

/* -------------------------
   HELPERS
   ------------------------- */
const safeValToList = (snap) => {
  const v = snap.val();
  if (!v) return [];
  // if object map keyed by id -> return array of values with id property
  if (typeof v === "object" && !Array.isArray(v)) {
    return Object.entries(v).map(([k, item]) =>
      item && typeof item === "object" ? { id: k, ...item } : { id: k, value: item }
    );
  }
  if (Array.isArray(v)) return v;
  return [v];
};

/* -------------------------
   TOKO helpers
   ------------------------- */

/**
 * Try to read toko name from a couple of common places:
 *  - /toko/{tokoId}/info/name
 *  - /dataManagement/tokoLabels/{tokoId}
 *  - /toko/{tokoId}/name
 *
 * Returns string or null
 */
export const getTokoName = async (tokoId) => {
  try {
    if (!tokoId && tokoId !== 0) return null;
    const paths = [
      `toko/${tokoId}/info/name`,
      `toko/${tokoId}/name`,
      `dataManagement/tokoLabels/${tokoId}`,
      `toko/${tokoId}/info/nama`,
    ];
    for (const p of paths) {
      const s = await get(ref(db, p));
      if (s.exists()) {
        const val = s.val();
        // if object, try common properties
        if (typeof val === "object") {
          if (val.name) return val.name;
          if (val.nama) return val.nama;
          // fallback to JSON
          return JSON.stringify(val);
        }
        return String(val);
      }
    }
    return null;
  } catch (err) {
    console.error("getTokoName error:", err);
    return null;
  }
};

/**
 * listenTransaksiByToko(tokoId, callback)
 * - listens to /toko/{tokoId}/transaksi
 * - callback receives array of { id, ...data }
 * - returns unsubscribe function
 */
export const listenTransaksiByToko = (tokoId, callback) => {
  const r = ref(db, `toko/${tokoId}/transaksi`);
  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      const list = Object.entries(raw).map(([id, item]) => ({ id, ...item }));
      callback(list);
    },
    (err) => {
      console.error("listenTransaksiByToko error:", err);
      callback([]);
    }
  );
  // onValue returns an unsubscribe function when invoked, but modular SDK returns the listener itself.
  // Returning a cleanup function for caller convenience:
  return () => unsub && unsub();
};

/**
 * addTransaksi(tokoId, data) / updateTransaksi / deleteTransaksi
 * These helpers match the original shape expected by DashboardToko
 */
export const addTransaksi = (tokoId, data) => {
  const r = push(ref(db, `toko/${tokoId}/transaksi`));
  return set(r, data);
};

export const updateTransaksi = (tokoId, id, data) => {
  return update(ref(db, `toko/${tokoId}/transaksi/${id}`), data);
};

export const deleteTransaksi = (tokoId, id) => {
  return remove(ref(db, `toko/${tokoId}/transaksi/${id}`));
};

/**
 * listenAllTransaksi(callback)
 * - listens to /toko and collects semua transaksi tiap toko lalu mengirimkan
 *   array merged of rows with { id, tokoId, TOKO, ...fields }
 */
export const listenAllTransaksi = (callback) => {
  const r = ref(db, "toko");
  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      const merged = [];
      Object.entries(raw).forEach(([tokoId, tokoData]) => {
        const tokoName = tokoData?.info?.name || tokoData?.name || `TOKO ${tokoId}`;
        if (tokoData?.transaksi) {
          Object.entries(tokoData.transaksi).forEach(([id, row]) => {
            merged.push({
              id,
              tokoId,
              ...row,
              TOKO: tokoName,
            });
          });
        }
      });
      // try to sort by TANGGAL desc (if present)
      merged.sort((a, b) => {
        const da = a.TANGGAL ? new Date(a.TANGGAL) : new Date(0);
        const dbd = b.TANGGAL ? new Date(b.TANGGAL) : new Date(0);
        return dbd - da;
      });
      callback(merged);
    },
    (err) => {
      console.error("listenAllTransaksi error:", err);
      callback([]);
    }
  );

  return () => unsub && unsub();
};

/* -------------------------
   USERS helpers
   ------------------------- */

/**
 * saveUserOnline(user)
 * - save user under /users/{username}
 */
export function saveUserOnline(user) {
  if (!user || !user.username) return Promise.reject(new Error("Invalid user"));
  return set(ref(db, `users/${user.username}`), user);
}

/** deleteUserOnline(username) */
export function deleteUserOnline(username) {
  if (!username) return Promise.reject(new Error("Invalid username"));
  return remove(ref(db, `users/${username}`));
}

/** listenUsers(callback) -> realtime list of users (array) */
export function listenUsers(callback) {
  const r = ref(db, "users");
  const unsub = onValue(
    r,
    (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val).map(([k, v]) => ({ username: k, ...v }));
      callback(list);
    },
    (err) => {
      console.error("listenUsers error:", err);
      callback([]);
    }
  );
  return () => unsub && unsub();
}

/** getAllUsersOnce() -> Promise<array> */
export async function getAllUsersOnce() {
  try {
    const snap = await get(ref(db, "users"));
    const data = snap.val() || {};
    return Object.entries(data).map(([k, v]) => ({ username: k, ...v }));
  } catch (err) {
    console.error("getAllUsersOnce error:", err);
    return [];
  }
}

/* -------------------------
   PENJUALAN helpers (DataManagement) - core for "Mode 3 (only penjualan realtime)"
   - path: /penjualan
   ------------------------- */

/** addPenjualan(data) -> push new penjualan under /penjualan */
export const addPenjualan = (data) => {
  const r = push(ref(db, "penjualan"));
  return set(r, data);
};

/** updatePenjualan(id, data) -> update /penjualan/{id} */
export const updatePenjualan = (id, data) => {
  return update(ref(db, `penjualan/${id}`), data);
};

/** deletePenjualan(id) -> remove /penjualan/{id} */
export const deletePenjualan = (id) => {
  return remove(ref(db, `penjualan/${id}`));
};

/**
 * listenPenjualan(callback) -> realtime listener for /penjualan
 * callback receives array of { id, ...data } sorted by date desc if TANGGAL available
 */
export const listenPenjualan = (callback) => {
  const r = ref(db, "penjualan");
  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      const list = Object.entries(raw).map(([id, item]) => ({ id, ...item }));
      // try sort by TANGGAL desc
      list.sort((a, b) => {
        const da = a.TANGGAL ? new Date(a.TANGGAL) : new Date(0);
        const dbd = b.TANGGAL ? new Date(b.TANGGAL) : new Date(0);
        return dbd - da;
      });
      callback(list);
    },
    (err) => {
      console.error("listenPenjualan error:", err);
      callback([]);
    }
  );
  return () => unsub && unsub();
};

/** getAllPenjualanOnce() -> Promise<array> */
export const getAllPenjualanOnce = async () => {
  try {
    const snap = await get(ref(db, "penjualan"));
    const data = snap.val() || {};
    return Object.entries(data).map(([id, item]) => ({ id, ...item }));
  } catch (err) {
    console.error("getAllPenjualanOnce error:", err);
    return [];
  }
};

/* -------------------------
   MASTER data helpers (optional convenience)
   - paths under /dataManagement (masterHarga, masterKatalog, sales, mdrRules, tenorRules, tokoLabels, refs)
   - these functions are not strictly required but useful for importing/exporting and UI sync
   ------------------------- */

export const getMasterHargaOnce = async () => {
  try {
    const snap = await get(ref(db, "dataManagement/masterHarga"));
    return snap.exists() ? Object.values(snap.val()) : [];
  } catch (err) {
    console.error("getMasterHargaOnce error:", err);
    return [];
  }
};

export const saveMasterHarga = (list) => {
  // overwrite the masterHarga node
  return set(ref(db, "dataManagement/masterHarga"), list || []);
};

export const getDataManagementOnce = async () => {
  try {
    const snap = await get(ref(db, "dataManagement"));
    return snap.exists() ? snap.val() : {};
  } catch (err) {
    console.error("getDataManagementOnce error:", err);
    return {};
  }
};

export const saveDataManagement = (obj) => {
  return set(ref(db, "dataManagement"), obj || {});
};

/* -------------------------
   Default export (grouped) - optional
   ------------------------- */
const FirebaseService = {
  getTokoName,
  listenTransaksiByToko,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
  listenAllTransaksi,

  saveUserOnline,
  deleteUserOnline,
  listenUsers,
  getAllUsersOnce,

  addPenjualan,
  updatePenjualan,
  deletePenjualan,
  listenPenjualan,
  getAllPenjualanOnce,

  getMasterHargaOnce,
  saveMasterHarga,
  getDataManagementOnce,
  saveDataManagement,
};

export default FirebaseService;
