// src/services/FirebaseService.js
import { db } from "../FirebaseInit";
import {
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
  return () => unsub && unsub();
};

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

export const listenAllTransaksi = (callback) => {
  const r = ref(db, "toko");
  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      const merged = [];

      Object.entries(raw).forEach(([tokoId, tokoData]) => {
        const tokoName =
          tokoData?.info?.name || tokoData?.name || `TOKO ${tokoId}`;

        if (tokoData?.transaksi) {
          Object.entries(tokoData.transaksi).forEach(([id, row]) => {
            merged.push({ id, tokoId, TOKO: tokoName, ...row });
          });
        }
      });

      merged.sort((a, b) =>
        new Date(b.TANGGAL || 0) - new Date(a.TANGGAL || 0)
      );

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
      const list = Object.entries(raw).map(([id, item]) => ({ id, ...item }));

      list.sort((a, b) =>
        new Date(b.TANGGAL_TRANSAKSI || 0) -
        new Date(a.TANGGAL_TRANSAKSI || 0)
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

// Tambah stok
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
};

export default FirebaseService;
