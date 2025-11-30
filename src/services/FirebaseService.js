// src/services/FirebaseService.js
// FirebaseService.js — PRO MAX edition
// Improvements:
// - normalize transaksi to always include `id`, tokoId, TOKO
// - ensure addTransaksi writes data with the firebase key as id
// - listenAllTransaksi sorts by TANGGAL_TRANSAKSI and normalizes missing fields
// - forceDeleteTransaksi to remove legacy rows without id based on matcher
// - robust helper functions and safer get/set/remove usage

import { db } from "../FirebaseInit";
import {
  getDatabase, 
  ref,
  onValue,
  get,
  set,
  update,
  push,
  remove,
  runTransaction,
} from "firebase/database";


/* ============================================================
   HELPERS
============================================================ */

/**
 * Convert snapshot val to list safely
 */
const safeValToList = (snap) => {
  const v = snap.val();
  if (!v) return [];
  if (typeof v === "object" && !Array.isArray(v)) {
    return Object.entries(v).map(([id, item]) =>
      typeof item === "object" ? { id, ...item } : { id, value: item }
    );
  }
  return Array.isArray(v) ? v : [v];
};

/**
 * Normalize transaksi row into consistent shape used by app
 * Ensures id, tokoId, TOKO exist.
 */
const normalizeTransaksi = (id, row = {}, tokoId = null, tokoName = "") => {
  const fixed = {
    id: id || null,
    tokoId,
    TOKO: tokoName || "",
    // keep all other fields
    ...row,
  };

  // Backwards compatibility: support older field names
  if (!fixed.TANGGAL_TRANSAKSI && fixed.TANGGAL) {
    fixed.TANGGAL_TRANSAKSI = fixed.TANGGAL;
  }

  // ensure QTY is numeric for calculations
  if (fixed.QTY !== undefined) {
    fixed.QTY = Number(fixed.QTY);
  }

  return fixed;
};

/* ============================================================
   TOKO HELPERS
============================================================ */

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
      const snap = await get(ref(db, p));
      if (snap.exists()) {
        const v = snap.val();
        if (typeof v === "object") return v.name || v.nama || JSON.stringify(v);
        return String(v);
      }
    }
    return null;
  } catch (err) {
    console.error("getTokoName error:", err);
    return null;
  }
};

/* ============================================================
   TRANSAKSI PER TOKO
============================================================ */

/**
 * Listen transaksi for single toko (returns array of rows {id, ...})
 */
export const listenTransaksiByToko = (tokoId, callback) => {
  const r = ref(db, `toko/${tokoId}/transaksi`);
  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      const list = Object.entries(raw).map(([id, item]) => normalizeTransaksi(id, item, tokoId));
      callback(list);
    },
    (err) => {
      console.error("listenTransaksiByToko error:", err);
      callback([]);
    }
  );
  return () => unsub && unsub();
};

/**
 * Add transaksi: writes a new transaksi and ensures id is stored in the object.
 * Returns the generated key.
 */
export const addTransaksi = async (tokoId, data) => {
  const r = push(ref(db, `toko/${tokoId}/transaksi`));
  const payload = {
    ...data,
    // if caller didn't include TANGGAL_TRANSAKSI, try to keep consistent timestamp
    TANGGAL_TRANSAKSI: data.TANGGAL_TRANSAKSI || data.TANGGAL || new Date().toISOString(),
  };
  await set(r, payload);
  // Optionally set id inside object for easier migration/read (not strictly necessary)
  try {
    await update(ref(db, `toko/${tokoId}/transaksi/${r.key}`), { id: r.key });
  } catch (e) {
    // ignore update error (best-effort)
    console.warn("Could not set id field on new transaksi:", e);
  }
  return r.key;
};

/**
 * Update transaksi by id
 */
export const updateTransaksi = (tokoId, id, data) => {
  return update(ref(db, `toko/${tokoId}/transaksi/${id}`), data);
};

/**
 * Delete transaksi by id
 */
export const deleteTransaksi = (tokoId, id) => {
  return remove(ref(db, `toko/${tokoId}/transaksi/${id}`));
};

/**
 * Listen ALL transaksi across semua toko, return merged array normalized.
 * Sorting uses TANGGAL_TRANSAKSI (newer first).
 */
export const listenAllTransaksi = (callback) => {
  const r = ref(db, "toko");
  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      const merged = [];

      Object.entries(raw).forEach(([tokoId, tokoData]) => {
        const tokoName =
          (tokoData && tokoData.info && tokoData.info.name) ||
          tokoData?.name ||
          `TOKO ${tokoId}`;

        if (tokoData?.transaksi) {
          Object.entries(tokoData.transaksi).forEach(([id, row]) => {
            merged.push(normalizeTransaksi(id, row, tokoId, tokoName));
          });
        }
      });

      // sort by TANGGAL_TRANSAKSI (newest first), fallback to createdAt or id
      merged.sort((a, b) => {
        const ta = new Date(a.TANGGAL_TRANSAKSI || a.createdAt || 0).getTime() || 0;
        const tb = new Date(b.TANGGAL_TRANSAKSI || b.createdAt || 0).getTime() || 0;
        return tb - ta;
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

/* ============================================================
   FORCE DELETE (for legacy rows without ID or inconsistent data)
   This helper scans transaksi path for a toko and deletes children
   that match the provided matchFn(val) predicate.
============================================================ */

/**
 * matchFn: (val) => boolean
 */
export const forceDeleteTransaksi = async (tokoId, matchFn) => {
  try {
    if (tokoId === undefined || tokoId === null) return;
    const transaksiPath = `toko/${tokoId}/transaksi`;
    const snap = await get(ref(db, transaksiPath));
    if (!snap.exists()) return;

    const deletes = [];
    snap.forEach((child) => {
      const val = child.val();
      try {
        if (matchFn(val, child.key)) {
          deletes.push(remove(ref(db, `${transaksiPath}/${child.key}`)));
        }
      } catch (e) {
        console.warn("forceDeleteTransaksi matchFn error for child:", child.key, e);
      }
    });

    if (deletes.length) {
      await Promise.all(deletes);
    }
  } catch (err) {
    console.error("forceDeleteTransaksi error", err);
  }
};

/* ============================================================
   USERS MANAGEMENT
============================================================ */

export const saveUserOnline = (user) => {
  if (!user?.username) return Promise.reject("Invalid User");
  return set(ref(db, `users/${user.username}`), user);
};

export const deleteUserOnline = (username) => {
  return remove(ref(db, `users/${username}`));
};

export const listenUsers = (callback) => {
  const r = ref(db, "users");
  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      callback(
        Object.entries(raw).map(([username, data]) => ({
          username,
          ...data,
        }))
      );
    },
    (err) => {
      console.error("listenUsers error:", err);
      callback([]);
    }
  );
  return () => unsub && unsub();
};

export const getAllUsersOnce = async () => {
  try {
    const snap = await get(ref(db, "users"));
    const v = snap.val() || {};
    return Object.entries(v).map(([username, data]) => ({
      username,
      ...data,
    }));
  } catch {
    return [];
  }
};

/* ============================================================
   PENJUALAN (DataManagement)
============================================================ */

export const addPenjualan = (data) => {
  const r = push(ref(db, "penjualan"));
  return set(r, data);
};

export const updatePenjualan = (id, data) => {
  return update(ref(db, `penjualan/${id}`), data);
};

export const deletePenjualan = (id) => {
  return remove(ref(db, `penjualan/${id}`));
};

export const listenPenjualan = (callback) => {
  const r = ref(db, "penjualan");

  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      const list = Object.entries(raw).map(([id, item]) => normalizeTransaksi(id, item));
      list.sort((a, b) =>
        new Date(b.TANGGAL_TRANSAKSI || 0) - new Date(a.TANGGAL_TRANSAKSI || 0)
      );
      callback(list);
    },
    (err) => {
      console.error("listenPenjualan error:", err);
      callback([]);
    }
  );
  return () => unsub && unsub();
};

/* ============================================================
   STOCK MANAGEMENT + TRANSFER STOCK
============================================================ */

// Listen seluruh stok
export const listenStockAll = (callback) => {
  const r = ref(db, "stock");
  const unsub = onValue(
    r,
    (snap) => callback(snap.val() || {}),
    (err) => {
      console.error("listenStockAll error:", err);
      callback({});
    }
  );
  return () => unsub && unsub();
};

// Ambil stok per toko per SKU
export const getStockForToko = async (tokoName, sku) => {
  const snap = await get(ref(db, `stock/${tokoName}/${sku}`));
  return snap.exists() ? snap.val() : null;
};

// Tambah stok (safe transaction)
export const addStock = (tokoName, sku, payload) => {
  const r = ref(db, `stock/${tokoName}/${sku}`);
  return runTransaction(r, (cur) => {
    const curQty = Number(cur?.qty || 0);
    return {
      ...cur,
      nama: payload.nama || cur?.nama || "",
      imei: payload.imei || cur?.imei || "",
      qty: curQty + Number(payload.qty || 0),
      updatedAt: new Date().toISOString(),
    };
  });
};

// Kurangi stok
export const reduceStock = async (tokoName, sku, qty) => {
  const r = ref(db, `stock/${tokoName}/${sku}`);

  const result = await runTransaction(r, (cur) => {
    const curQty = Number(cur?.qty || 0);
    const remaining = curQty - Number(qty);

    if (remaining < 0) return; // abort

    return {
      ...cur,
      qty: remaining,
      updatedAt: new Date().toISOString(),
    };
  });

  if (!result.committed) {
    throw new Error("Insufficient stock");
  }

  return result.snapshot.val();
};

// Transfer stok antar toko
export const transferStock = async ({
  fromToko,
  toToko,
  sku,
  qty,
  nama = "",
  imei = "",
  keterangan = "",
  performedBy = "",
}) => {
  if (!fromToko || !toToko || !sku) throw new Error("Missing parameters");
  if (fromToko === toToko) throw new Error("From & To cannot be the same");

  const timestamp = new Date().toISOString();

  // 1. Kurangi
  await reduceStock(fromToko, sku, qty);

  // 2. Tambah ke tujuan
  await addStock(toToko, sku, { nama, imei, qty });

  // 3. Catat riwayat
  const hist = push(ref(db, "transfer_history"));
  await set(hist, {
    from: fromToko,
    to: toToko,
    sku,
    qty,
    nama,
    imei,
    keterangan,
    performedBy,
    timestamp,
  });

  return true;
};

/* ============================================================
   INVENTORY WRAPPER — untuk integrasi DataManagement & Dashboard
============================================================ */

/**
 * Ambil item stok berdasarkan toko + sku
 */
export const getInventoryItem = async (tokoName, sku) => {
  if (!tokoName || !sku) return null;
  try {
    const snap = await get(ref(db, `stock/${tokoName}/${sku}`));
    return snap.exists() ? { id: sku, ...snap.val() } : null;
  } catch (err) {
    console.error("getInventoryItem error:", err);
    return null;
  }
};

/**
 * Update stok (langsung overwrite field yang diberikan)
 */
export const updateInventory = async (tokoName, sku, updates = {}) => {
  if (!tokoName || !sku) return null;
  try {
    await update(ref(db, `stock/${tokoName}/${sku}`), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("updateInventory error:", err);
  }
};

/**
 * Membuat stok baru jika belum ada
 */
export const createInventory = async (tokoName, sku, payload = {}) => {
  if (!tokoName || !sku) return null;

  try {
    await set(ref(db, `stock/${tokoName}/${sku}`), {
      nama: payload.nama || "",
      imei: payload.imei || "",
      qty: Number(payload.qty || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("createInventory error:", err);
  }
};

/**
 * Fungsi utama — aman dipanggil oleh DataManagement.jsx
 * delta > 0  → menambah stok
 * delta < 0  → mengurangi stok (akan abort kalau stok kurang)
 */
export const adjustInventoryStock = async (tokoName, sku, delta) => {
  if (!tokoName || !sku || !delta) return;
  try {
    if (delta > 0) {
      // menambah stok
      await addStock(tokoName, sku, { qty: delta });
    } else {
      // mengurangi stok
      await reduceStock(tokoName, sku, Math.abs(delta));
    }
  } catch (err) {
    console.error("adjustInventoryStock error:", err);
  }
};

// buat transfer request (push ke "transfer_requests")
export const createTransferRequest = (payload) => {
  const r = push(ref(db, "transfer_requests"));
  return set(r, { ...payload, id: r.key });
};

// listen transfer requests (for admin)
export const listenTransferRequests = (callback) => {
  const r = ref(db, "transfer_requests");
  const unsub = onValue(r, (snap) => {
    const raw = snap.val() || {};
    const arr = Object.entries(raw).map(([id, v]) => ({ id, ...v }));
    // only pending by default
    callback(arr.filter(x => !x.status || x.status === "Pending"));
  }, (err) => { console.error(err); callback([]); });
  return () => unsub && unsub();
};

// update transfer request (approve / reject)
export const updateTransferRequest = (id, data) => {
  return update(ref(db, `transfer_requests/${id}`), data);
};

// HAPUS DATA MASTER di /stock/{brand}/{sku}
// export const deleteMasterBarang = async (brand, barang) => {
//   try {
//     const sku = `${brand}_${barang}`.replace(/\s+/g, "_");
//     const path = `stock/${brand}/${sku}`;
//     await remove(ref(db, path));
//     return true;
//   } catch (err) {
//     console.error("deleteMasterBarang:", err);
//     return false;
//   }
// };

/* ============================================================
   MASTER KARYAWAN
   Path: /karyawan/{id}
============================================================ */

// Listen realtime seluruh karyawan
export const listenKaryawan = (callback) => {
  const r = ref(db, "karyawan");
  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      const arr = Object.entries(raw).map(([id, v]) => ({
        id,
        ...v,
      }));
      callback(arr);
    },
    (err) => {
      console.error("listenKaryawan error:", err);
      callback([]);
    }
  );
  return () => unsub && unsub();
};

// Tambah karyawan
export const addKaryawan = async (data) => {
  try {
    const r = push(ref(db, "karyawan"));
    await set(r, {
      ...data,
      id: r.key,
      createdAt: new Date().toISOString(),
    });
    return r.key;
  } catch (err) {
    console.error("addKaryawan error:", err);
    throw err;
  }
};

// Update karyawan
export const updateKaryawan = async (id, data) => {
  try {
    await update(ref(db, `karyawan/${id}`), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error("updateKaryawan error:", err);
    throw err;
  }
};

// Hapus karyawan
export const deleteKaryawan = async (id) => {
  try {
    await remove(ref(db, `karyawan/${id}`));
    return true;
  } catch (err) {
    console.error("deleteKaryawan error:", err);
    throw err;
  }
};

/* =========================
   MASTER BARANG DELETE
========================= */

export const deleteMasterBarang = async (brand, barang) => {
  const sku = `${brand}_${barang}`.replace(/\s+/g, "_");
  return remove(ref(db, `stock/${brand}/${sku}`));
};

// ================== POTONG STOK MASTER BARANG BY IMEI (REALTIME DB VERSION) ==================
export const potongStockMasterByImei = async (imei) => {
  if (!imei) return;

  try {
    const r = ref(db, "toko");
    const snap = await get(r);

    if (!snap.exists()) {
      console.warn("DATA TOKO TIDAK DITEMUKAN");
      return;
    }

    const semuaToko = snap.val();
    let target = null;
    let targetPath = null;

    // LOOP SEMUA TOKO & TRANSAKSI
    Object.entries(semuaToko).forEach(([tokoId, tokoData]) => {
      if (!tokoData?.transaksi) return;

      Object.entries(tokoData.transaksi).forEach(([trxId, trx]) => {
        if (
          trx.IMEI === imei &&
          trx.NAMA_TOKO === "CILANGKAP PUSAT" &&
          trx.PAYMENT_METODE === "PEMBELIAN" &&
          trx.STATUS === "Approved"
        ) {
          target = trx;
          targetPath = `toko/${tokoId}/transaksi/${trxId}`;
        }
      });
    });

    if (!target || !targetPath) {
      console.warn("❌ STOK PUSAT TIDAK DITEMUKAN UNTUK IMEI:", imei);
      return;
    }

    // ✅ UPDATE STATUS MENJADI TERJUAL
    await update(ref(db, targetPath), {
      STATUS: "TERJUAL",
      KETERANGAN: "AUTO SOLD DARI DASHBOARD TOKO",
      TANGGAL_KELUAR: new Date().toISOString().slice(0, 10),
    });

    console.log("✅ STOCK MASTER BERHASIL DIPOTONG UNTUK IMEI:", imei);
  } catch (err) {
    console.error("❌ GAGAL POTONG STOK MASTER:", err);
  }
};

export const restoreStockByImeiRealtime = async (imei, namaToko) => {
  const db = getDatabase();
  const trxRef = ref(db, "toko");

  const snapshot = await get(trxRef);
  if (!snapshot.exists()) return;

  snapshot.forEach((tokoSnap) => {
    tokoSnap.child("transaksi").forEach((child) => {
      const val = child.val();

      if (
        String(val.IMEI || "") === String(imei) &&
        (val.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN"
      ) {
        const newQty = Number(val.QTY || 0) + 1;

        update(
          ref(db, `toko/${tokoSnap.key}/transaksi/${child.key}`),
          { QTY: newQty }
        );
      }
    });
  });
};





/* ============================================================
   DEFAULT EXPORT
============================================================ */
const FirebaseService = {
  getTokoName,
  listenTransaksiByToko,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
  listenAllTransaksi,
  forceDeleteTransaksi,
  deleteMasterBarang,

  addPenjualan,
  updatePenjualan,
  deletePenjualan,
  listenPenjualan,

  saveUserOnline,
  deleteUserOnline,
  listenUsers,
  getAllUsersOnce,

  listenStockAll,
  getStockForToko,
  addStock,
  reduceStock,
  transferStock,

  getInventoryItem,
  updateInventory,
  createInventory,
  adjustInventoryStock,

  createTransferRequest,
  listenTransferRequests,
  updateTransferRequest,

  listenKaryawan,
  addKaryawan,
  updateKaryawan,
  deleteKaryawan,

};

export default FirebaseService;
