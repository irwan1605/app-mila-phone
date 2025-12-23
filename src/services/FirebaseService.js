// src/services/FirebaseService.js
// FirebaseService.js — PRO MAX edition
// Improvements:
// - normalize transaksi to always include `id`, tokoId, TOKO
// - ensure addTransaksi writes data with the firebase key as id
// - listenAllTransaksi sorts by TANGGAL_TRANSAKSI and normalizes missing fields
// - forceDeleteTransaksi to remove legacy rows without id based on matcher
// - robust helper functions and safer get/set/remove usage

// src/services/FirebaseService.js
import { db } from "./FirebaseInit";
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
  query, // ⬅️ TAMBAH
  orderByChild, // ⬅️ TAMBAH
  limitToLast, // ⬅️ TAMBAH
  startAt, // ⬅️ TAMBAH
  endAt, // ⬅️ TAMBAH
} from "firebase/database";

/* ============================================================
   HELPERS
============================================================ */

export const unlockImei = async (imei) => {
  await set(ref(db, `imeiLocks/${imei}`), null);
};

export const rollbackStock = async (toko, sku, qty) => {
  await updateStockAtomic(toko, sku, qty);
};

// 🧾 SIMPAN AUDIT LOG
export const addAuditLog = async (logId, data) => {
  await set(ref(db, `auditLogs/${logId}`), {
    ...data,
    createdAt: Date.now(),
  });
};

// 🔄 UPDATE AUDIT LOG
export const updateAuditLog = async (logId, data) => {
  await update(ref(db, `auditLogs/${logId}`), data);
};

// 🔒 LOCK IMEI SECARA ATOMIC (ANTI DOUBLE SALES)
export const lockImeiAtomic = async (imei, payload) => {
  const imeiRef = ref(db, `imeiLocks/${imei}`);

  const result = await runTransaction(imeiRef, (current) => {
    if (current) {
      // ❌ IMEI sudah ada → abort
      return;
    }
    return {
      status: "SOLD",
      ...payload,
      lockedAt: Date.now(),
    };
  });

  if (!result.committed) {
    throw new Error(`IMEI ${imei} sudah terjual`);
  }
};

// 🔒 UPDATE STOK ATOMIC (ANTI MINUS)
export const updateStockAtomic = async (toko, sku, diffQty) => {
  const stockRef = ref(db, `stock/${toko}/${sku}`);

  const result = await runTransaction(stockRef, (current) => {
    const currQty = Number(current?.qty || 0);
    const nextQty = currQty + diffQty;

    if (nextQty < 0) {
      return; // ❌ abort
    }

    return {
      ...current,
      qty: nextQty,
      updatedAt: Date.now(),
    };
  });

  if (!result.committed) {
    throw new Error(`Stok ${toko} tidak mencukupi`);
  }
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

// CREATE
export const addMasterKategoriBarang = async (data) => {
  try {
    const r = push(ref(db, "masterKategoriBarang"));
    await set(r, {
      ...data,
      id: r.key,
      createdAt: Date.now(),
    });
    return r.key;
  } catch (err) {
    console.error("🔥 Firebase addMasterKategoriBarang ERROR:", err);
    throw err; // ⬅️ WAJIB agar React tahu error Firebase
  }
};

// READ (LISTEN)
export const listenMasterKategoriBarang = (callback) => {
  const q = ref(db, "masterKategoriBarang");
  return onValue(q, (snap) => {
    const data = snap.val() || {};
    const list = Object.entries(data).map(([id, v]) => ({
      id,
      ...v,
    }));
    callback(list);
  });
};

// UPDATE
export const updateMasterKategoriBarang = async (id, data) => {
  await update(ref(db, `masterKategoriBarang/${id}`), data);
};

// DELETE
export const deleteMasterKategoriBarang = async (id) => {
  await remove(ref(db, `masterKategoriBarang/${id}`));
};

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
      const list = Object.entries(raw).map(([id, item]) =>
        normalizeTransaksi(id, item, tokoId)
      );
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
 * Listen transaksi per toko versi hemat kuota
 * - limit: jumlah data terakhir (default 200)
 * - startDate / endDate: filter range tanggal (opsional, format "YYYY-MM-DD")
 */
export const listenTransaksiByTokoHemat = (tokoId, options = {}, callback) => {
  const { limit = 200, startDate, endDate } = options || {};

  const baseRef = ref(db, `toko/${tokoId}/transaksi`);

  // kalau tidak ada filter sama sekali, fallback ke full ref (tapi tetap 1 listener)
  if (!limit && !startDate && !endDate) {
    const unsub = onValue(
      baseRef,
      (snap) => {
        const raw = snap.val() || {};
        const list = Object.entries(raw).map(([id, item]) =>
          normalizeTransaksi(id, item, tokoId)
        );
        callback(list);
      },
      (err) => {
        console.error("listenTransaksiByTokoHemat error:", err);
        callback([]);
      }
    );
    return () => unsub && unsub();
  }

  // versi hemat: pakai query orderByChild + limitToLast + startAt/endAt
  const constraints = [orderByChild("TANGGAL_TRANSAKSI")];

  if (startDate) constraints.push(startAt(startDate));
  if (endDate) constraints.push(endAt(endDate));
  if (limit) constraints.push(limitToLast(limit));

  const q = query(baseRef, ...constraints);

  const unsub = onValue(
    q,
    (snap) => {
      const raw = snap.val() || {};
      const list = Object.entries(raw).map(([id, item]) =>
        normalizeTransaksi(id, item, tokoId)
      );

      // untuk jaga-jaga, sort lagi dari terbaru ke lama
      list.sort(
        (a, b) =>
          new Date(b.TANGGAL_TRANSAKSI || 0) -
          new Date(a.TANGGAL_TRANSAKSI || 0)
      );

      callback(list);
    },
    (err) => {
      console.error("listenTransaksiByTokoHemat error:", err);
      callback([]);
    }
  );

  return () => unsub && unsub();
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
        const ta =
          new Date(a.TANGGAL_TRANSAKSI || a.createdAt || 0).getTime() || 0;
        const tb =
          new Date(b.TANGGAL_TRANSAKSI || b.createdAt || 0).getTime() || 0;
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
        console.warn(
          "forceDeleteTransaksi matchFn error for child:",
          child.key,
          e
        );
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
  const r = ref(db, "penjualan,transaksi");

  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      const list = Object.entries(raw).map(([id, item]) =>
        normalizeTransaksi(id, item)
      );
      list.sort(
        (a, b) =>
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
  return onValue(r, (snap) => {
    const data = snap.val() || {};
    const list = Object.values(data).filter(
      (x) => x.PAYMENT_METODE === "PENJUALAN"
    );
    callback(list);
  });
  return () => unsub && unsub();
};

/**
 * Listen penjualan versi hemat kuota
 * - limit: jumlah data terakhir (default 200)
 * - startDate / endDate: filter range tanggal (opsional, format "YYYY-MM-DD")
 */
export const listenPenjualanHemat = (callback, options = {}) => {
  const { limit = 200, startDate, endDate } = options || {};

  const baseRef = ref(db, "penjualan");

  // jika tanpa filter & limit, sama seperti listenPenjualan biasa
  if (!limit && !startDate && !endDate) {
    return listenPenjualan(callback);
  }

  const constraints = [orderByChild("TANGGAL_TRANSAKSI")];

  if (startDate) constraints.push(startAt(startDate));
  if (endDate) constraints.push(endAt(endDate));
  if (limit) constraints.push(limitToLast(limit));

  const q = query(baseRef, ...constraints);

  const unsub = onValue(
    q,
    (snap) => {
      const raw = snap.val() || {};
      const list = Object.entries(raw).map(([id, item]) =>
        normalizeTransaksi(id, item)
      );

      list.sort(
        (a, b) =>
          new Date(b.TANGGAL_TRANSAKSI || 0) -
          new Date(a.TANGGAL_TRANSAKSI || 0)
      );

      callback(list);
    },
    (err) => {
      console.error("listenPenjualanHemat error:", err);
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
export const addStock = async (toko, sku, payload) => {
  const stockRef = ref(db, `stock/${toko}/${sku}`);
  const snap = await get(stockRef);

  const currentQty = snap.val()?.qty || 0;

  await set(stockRef, {
    ...snap.val(),
    ...payload,
    qty: currentQty + Number(payload.qty || 0),
    updatedAt: Date.now(),
  });
};

// Kurangi stok
// Kurangi stok (mendukung model qty langsung & model varian / child)
export const reduceStock = async (tokoName, sku, qty) => {
  const r = ref(db, `stock/${tokoName}/${sku}`);

  const result = await runTransaction(r, (cur) => {
    const nQty = Number(qty || 0);
    if (!cur || nQty <= 0) return cur;

    // ✅ CASE 1: qty langsung di root
    if (typeof cur.qty === "number") {
      const remaining = Number(cur.qty) - nQty;
      if (remaining < 0) return; // abort → insufficient
      return {
        ...cur,
        qty: remaining,
        updatedAt: new Date().toISOString(),
      };
    }

    // ✅ CASE 2: varian anak yang punya field qty masing-masing
    let total = 0;
    Object.values(cur).forEach((v) => {
      if (v && typeof v.qty === "number") {
        total += Number(v.qty);
      }
    });

    // kalau total stok semua varian < qty yang diminta → abort
    if (total < nQty) return;

    // Kurangi stok dari varian-varian sampai habis nQty
    let toReduce = nQty;
    const next = { ...cur };

    Object.keys(next).forEach((key) => {
      if (toReduce <= 0) return;
      const item = next[key];
      if (!item || typeof item.qty !== "number") return;

      const canTake = Math.min(Number(item.qty), toReduce);
      next[key] = {
        ...item,
        qty: Number(item.qty) - canTake,
        updatedAt: new Date().toISOString(),
      };
      toReduce -= canTake;
    });

    return next;
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

// ===================== NOTIFICATION =====================
const pushNotification = async (payload) => {
  const id = Date.now().toString();

  await set(ref(db, `notifications/${id}`), {
    ...payload,
    id,
    createdAt: payload.createdAt || new Date().toISOString(),
  });
};

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

// ===================== UPDATE IMEI STATUS =====================
// =====================
// UPDATE IMEI STATUS TANPA QUERY (NO INDEX)
// =====================
export const updateImeiStatusSafe = async (toko, imeiList, status) => {
  if (!toko || !Array.isArray(imeiList) || !imeiList.length) return;

  const snap = await get(ref(db, "inventory"));
  if (!snap.exists()) return;

  const updates = {};

  snap.forEach((child) => {
    const row = child.val();
    if (
      imeiList.includes(String(row.IMEI)) &&
      String(row.NAMA_TOKO).toUpperCase() === String(toko).toUpperCase()
    ) {
      updates[`inventory/${child.key}/STATUS`] = status;
      updates[`inventory/${child.key}/NAMA_TOKO`] = toko;
      updates[`inventory/${child.key}/updatedAt`] = new Date().toISOString();
    }
  });

  if (Object.keys(updates).length) {
    await update(ref(db), updates); // 🔥 MULTI UPDATE (ATOMIC)
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
  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      const arr = Object.entries(raw).map(([id, v]) => ({ id, ...v }));
      // only pending by default
      callback(arr.filter((x) => !x.status || x.status === "Pending"));
    },
    (err) => {
      console.error(err);
      callback([]);
    }
  );
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

        update(ref(db, `toko/${tokoSnap.key}/transaksi/${child.key}`), {
          QTY: newQty,
        });
      }
    });
  });
};

/* ============================================================
   AUTO-GENERATE & HARD-LOCK ID PELANGGAN
============================================================ */

const generateNextPelangganId = async () => {
  const counterRef = ref(db, "counters/masterPelanggan");

  const result = await runTransaction(counterRef, (current) => {
    return Number(current || 0) + 1;
  });

  const nextNumber = result.snapshot.val();
  const padded = String(nextNumber).padStart(3, "0");
  return `PLG-${padded}`;
};

const checkDuplicateIdPelanggan = async (idPelanggan) => {
  const snap = await get(ref(db, "dataManagement/masterPelanggan"));
  if (!snap.exists()) return false;

  const data = snap.val();
  return Object.values(data).some(
    (item) => String(item.idPelanggan) === String(idPelanggan)
  );
};

/* ============================================================
   MASTER PELANGGAN ✅ CUSTOM (AUTO-ID + HARD-LOCK)
============================================================ */

const masterPelangganBasePath = "dataManagement/masterPelanggan";

export const listenMasterPelanggan = (callback) => {
  const r = ref(db, masterPelangganBasePath);
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
    () => callback([])
  );
  return () => unsub && unsub();
};

export const addMasterPelanggan = async (data) => {
  const idPelanggan = await generateNextPelangganId();

  const duplicate = await checkDuplicateIdPelanggan(idPelanggan);
  if (duplicate) throw new Error("ID Pelanggan duplikat!");

  const r = push(ref(db, masterPelangganBasePath));
  await set(r, {
    ...data,
    id: r.key,
    idPelanggan,
    createdAt: new Date().toISOString(),
  });

  return r.key;
};

export const updateMasterPelanggan = async (id, data) => {
  if (data.idPelanggan) {
    const duplicate = await checkDuplicateIdPelanggan(data.idPelanggan);
    if (duplicate) {
      throw new Error("Update dibatalkan: ID Pelanggan duplikat!");
    }
  }

  await update(ref(db, `${masterPelangganBasePath}/${id}`), {
    ...data,
    updatedAt: new Date().toISOString(),
  });

  return true;
};

export const deleteMasterPelanggan = async (id) => {
  await remove(ref(db, `${masterPelangganBasePath}/${id}`));
  return true;
};

export const getStockTotalBySKU = async (toko, sku) => {
  const snap = await get(ref(db, `stock/${toko}/${sku}`));
  if (!snap.exists()) return 0;

  const data = snap.val();

  // ✅ Jika langsung punya qty
  if (typeof data.qty === "number") return data.qty;

  // ✅ Jika pakai varian (128GB, 256GB, dll)
  let total = 0;
  Object.values(data).forEach((v) => {
    if (typeof v?.qty === "number") {
      total += Number(v.qty);
    }
  });

  return total;
};

/* ============================================================
   MASTER MANAGEMENT (REALTIME CRUD)
   Path: /dataManagement/{masterName}/{id}
============================================================ */

const createMasterHelpers = (masterName) => {
  const basePath = `dataManagement/${masterName}`;

  return {
    listen: (callback) => {
      const r = ref(db, basePath);
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
          console.error(`listen ${masterName} error:`, err);
          callback([]);
        }
      );
      return () => unsub && unsub();
    },

    add: async (data) => {
      const r = push(ref(db, basePath));
      await set(r, {
        ...data,
        id: r.key,
        createdAt: new Date().toISOString(),
      });
      return r.key;
    },

    update: async (id, data) => {
      return update(ref(db, `${basePath}/${id}`), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    },

    delete: async (id) => {
      return remove(ref(db, `${basePath}/${id}`));
    },
  };
};

// ===========================
// LISTENER REALTIME MASTER BARANG
// ===========================
export const listenMasterBarang = (callback) => {
  const r = ref(db, "dataManagement/masterBarang");
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
      console.error("listenMasterBarang error:", err);
      callback([]);
    }
  );
  return () => unsub && unsub();
};

// ==============================
// LISTEN INVENTORY REPORT by Toko
// ==============================
export const listenInventoryReport = (namaToko, callback) => {
  return onValue(
    ref(db, `inventory`),
    (snap) => {
      const data = snap.val() || {};

      const list = Object.values(data).filter(
        (row) => row.namaToko === namaToko
      );

      callback(list);
    },
    (err) => console.error("ERROR LISTEN INVENTORY:", err)
  );
};

// ================================
// STOCK ACTIVITY LOGGER
// ================================
export const logStockActivity = async ({
  tokoName,
  sku,
  qty,
  type, // IN | OUT | RETURN
  refId,
  user,
}) => {
  try {
    const id = Date.now();

    await set(ref(db, `stockLog/${id}`), {
      tokoName,
      sku,
      qty,
      type,
      refId,
      user,
      createdAt: Date.now(),
    });

    return { success: true };
  } catch (err) {
    console.error("logStockActivity error:", err);
    return { success: false, error: err };
  }
};

// =======================
// UPDATE TRANSAKSI
// =======================
// =======================
// UPDATE TRANSAKSI (LOCK BY TOKO)
// =======================
export const updateTransaksi = async (tokoId, id, data) => {
  if (!tokoId || !id) {
    throw new Error("updateTransaksi: tokoId dan id wajib");
  }

  // ❌ buang field toko dari payload agar tidak bisa dimanipulasi
  const { tokoId: _t, TOKO: _T, ...safeData } = data || {};

  try {
    await update(ref(db, `toko/${tokoId}/transaksi/${id}`), {
      ...safeData,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (err) {
    console.error("updateTransaksi error:", err);
    return { success: false, error: err };
  }
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
    TANGGAL_TRANSAKSI:
      data.TANGGAL_TRANSAKSI || data.TANGGAL || new Date().toISOString(),
  };
  await set(r, payload);
  // Optionally set id inside object for easier migration/read (not strictly necessary)
  try {
    await update(ref(db, `toko/${tokoId}/transaksi/${r.key}`), { id: r.key });
  } catch (e) {
    // ignore update error (best-effort)

    if (!tokoId) throw new Error("TOKO LOGIN WAJIB");

    const safePayload = {
      ...data,
      tokoId, // ⬅️ FORCE
      TOKO: tokoId, // ⬅️ FORCE
      createdAt: new Date().toISOString(),
    };

    const r = push(ref(db, `toko/${tokoId}/transaksi`));
    await set(r, safePayload);

    console.warn("Could not set id field on new transaksi:", e);
  }
  return r.key;
};

// =======================
// RETURN / BALIK STOK (AMAN)
// =======================
export const returnStock = async (tokoName, sku, qty = 1) => {
  if (!tokoName || !sku || qty <= 0) {
    throw new Error("returnStock: parameter tidak valid");
  }

  try {
    const stockRef = ref(db, `stock/${tokoName}/${sku}`);
    const snap = await get(stockRef);

    if (!snap.exists()) {
      // kalau stok belum ada → buat baru
      await set(stockRef, {
        qty: Number(qty),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const currentQty = Number(snap.val().qty || 0);
      await update(stockRef, {
        qty: currentQty + Number(qty),
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true };
  } catch (err) {
    console.error("returnStock error:", err);
    return { success: false, error: err };
  }
};

// ======================================================
// 🔥 MIGRASI KATEGORI STOCK (SEKALI JALAN)
// ======================================================

export const migrateStockKategori = async () => {
  const stockRef = ref(db, "stock");
  const snap = await get(stockRef);

  if (!snap.exists()) {
    alert("❌ Tidak ada data stock");
    return;
  }

  const stock = snap.val();
  const updates = {};

  Object.entries(stock).forEach(([namaToko, items]) => {
    Object.entries(items || {}).forEach(([sku, item]) => {
      let kategori =
        item.kategori || item.KATEGORI_BRAND || item.kategoriBrand || "";

      kategori = kategori.toUpperCase().trim();

      if (kategori === "ACCESORIES") kategori = "ACCESSORIES";
      if (kategori === "SPARE PART") kategori = "SPAREPART";

      if (kategori !== item.kategori) {
        updates[`stock/${namaToko}/${sku}/kategori`] = kategori;
      }
    });
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
    alert("✅ Migrasi kategori stock BERHASIL");
  } else {
    alert("ℹ️ Tidak ada data yang perlu dimigrasi");
  }
};

// baru pakai di function
export const addLogPembelian = async (data) => {
  const db = getDatabase();
  const logRef = push(ref(db, "logPembelian"));
  await set(logRef, {
    ...data,
    createdAt: Date.now(),
  });
};

// 🔒 CEK IMEI SUDAH DIJUAL ATAU BELUM
export const checkImeiAvailable = async (imei) => {
  const snap = await get(ref(db, `imeiLocks/${imei}`));
  return !snap.exists();
};

// 🔒 LOCK IMEI (SETELAH TRANSAKSI BERHASIL)
export const lockImei = async (imei, data) => {
  await set(ref(db, `imeiLocks/${imei}`), {
    status: "SOLD",
    ...data,
    lockedAt: Date.now(),
  });
};

// =======================
// MASTER BARANG (BY KATEGORI)
// =======================

export const listenMasterBarangByKategori = (kategori, callback) => {
  const r = ref(db, "dataManagement/masterBarang");
  return onValue(r, (snap) => {
    const raw = snap.val() || {};
    const arr = Object.entries(raw)
      .map(([id, v]) => ({ id, ...v }))
      .filter((x) => x.kategoriBarang === kategori);
    callback(arr);
  });
};

// ===================================================
// APPROVE TRANSFER — SAFE (NO QUERY, NO INDEX)
// ===================================================
// ===================================================
// APPROVE TRANSFER — FINAL SAFE (NO QUERY, NO INDEX)
// ===================================================
// ===================================================
// APPROVE TRANSFER — FINAL (SESUI STRUKTUR INVENTORY)
// ===================================================
// ===================================================
// APPROVE TRANSFER — FINAL (SESUAI INVENTORY ROOT)
// ===================================================
export const approveTransferSafe = async ({ transfer, performedBy }) => {
  const { id, imeis = [], tokoPengirim, dari, ke } = transfer;

  const fromToko = tokoPengirim || dari;
  if (!fromToko || !ke) {
    throw new Error("Toko asal / tujuan tidak valid");
  }

  const updates = {};
  const invSnap = await get(ref(db, "inventory"));

  if (!invSnap.exists()) {
    throw new Error("Inventory kosong");
  }

  let found = 0;

  invSnap.forEach((child) => {
    const row = child.val();

    if (
      imeis.includes(String(row.imei)) &&
      String(row.toko) === String(fromToko) &&
      row.status === "AVAILABLE"
    ) {
      // 🔥 PINDAHKAN STOK (UBAH TOKO)
      updates[`inventory/${child.key}/toko`] = ke;
      updates[`inventory/${child.key}/status`] = "AVAILABLE";
      updates[`inventory/${child.key}/updatedAt`] = new Date().toISOString();

      found++;
    }
  });

  if (found !== imeis.length) {
    throw new Error(
      `IMEI tidak lengkap di ${fromToko} (ditemukan ${found}/${imeis.length})`
    );
  }

  // ✅ UPDATE STATUS TRANSFER
  updates[`transfer_requests/${id}/status`] = "Approved";
  updates[`transfer_requests/${id}/approvedBy`] = performedBy;
  updates[`transfer_requests/${id}/approvedAt`] = new Date().toISOString();

  await update(ref(db), updates);

  return true;
};

// =======================================================
// APPROVE TRANSFER + PINDAH STOCK (IMEI BASED)
// =======================================================
export const approveTransferAndMoveStock = async ({
  transfer,
  performedBy,
}) => {
  const { id, imeis = [], tokoPengirim, dari, ke } = transfer;

  const fromToko = tokoPengirim || dari;
  const updates = {};

  const snap = await get(ref(db, "inventory"));
  if (!snap.exists()) throw new Error("Inventory kosong");

  snap.forEach((child) => {
    const row = child.val();

    if (
      imeis.includes(String(row.IMEI)) &&
      String(row.NAMA_TOKO).toUpperCase() === String(fromToko).toUpperCase()
    ) {
      // ⬅️ STOK KELUAR DARI TOKO PENGIRIM
      updates[`inventory/${child.key}/NAMA_TOKO`] = ke;
      updates[`inventory/${child.key}/STATUS`] = "AVAILABLE";
      updates[`inventory/${child.key}/updatedAt`] = new Date().toISOString();
    }
  });

  // ⬅️ UPDATE STATUS TRANSFER
  updates[`transfer_requests/${id}/status`] = "Approved";
  updates[`transfer_requests/${id}/approvedBy`] = performedBy;
  updates[`transfer_requests/${id}/approvedAt`] = new Date().toISOString();

  await update(ref(db), updates);
};

// ===================================================
// ===================== APPROVE TRANSFER FINAL (IMEI REAL) =====================

/**
 * APPROVE TRANSFER
 * - IMEI pindah toko (inventory)
 * - Stok toko pengirim berkurang
 * - Stok toko penerima bertambah
 * - Realtime ke InventoryReport & TransferBarang
 */
export const approveTransferFINAL = async (transfer, approvedBy) => {
  const { id, dari, ke, brand, barang, imeis } = transfer;
  const sku = `${brand}_${barang}`.replace(/\s+/g, "_");
  const now = new Date().toISOString();

  // 1️⃣ PINDAHKAN IMEI DI INVENTORY
  const snap = await get(ref(db, "inventory"));
  const updates = {};

  snap.forEach((child) => {
    const row = child.val();
    const imei = String(row.IMEI || row.imei);

    if (
      imeis.includes(imei) &&
      String(row.NAMA_TOKO).toUpperCase() === String(dari).toUpperCase()
    ) {
      updates[`inventory/${child.key}/NAMA_TOKO`] = ke;
      updates[`inventory/${child.key}/STATUS`] = "AVAILABLE";
      updates[`inventory/${child.key}/updatedAt`] = now;
    }
  });

  await update(ref(db), updates);

  // 2️⃣ UPDATE STOCK
  await reduceStock(dari, sku, imeis.length);
  await addStock(ke, sku, { nama: barang, qty: imeis.length });

  // 3️⃣ UPDATE STATUS TRANSFER
  await update(ref(db, `transfer_requests/${id}`), {
    status: "Approved",
    approvedAt: now,
    approvedBy,
  });
};

// ===================================================
// 🔥 APPROVE TRANSFER — ABSOLUTE FINAL (NO STOCK READ)
// ===================================================
// ===================================================
// 🔥 APPROVE TRANSFER — FINAL (TOTAL STOCK MODE)
// ===================================================
export const approveTransferABSOLUTE = async ({ transfer, performedBy }) => {
  const { id, tokoPengirim, dari, ke, qty, stockSnapshot } = transfer;

  const fromToko = tokoPengirim || dari;
  const q = Number(qty || 0);

  if (q <= 0) throw new Error("QTY tidak valid");

  const updates = {};

  // ⬅️ KURANGI STOK DI ITEM PERTAMA
  updates[`stock/${fromToko}/${stockSnapshot.firstKey}/qty`] =
    Number(stockSnapshot.firstItem.qty || 0) - q;

  // ➡️ TAMBAH STOK KE TOKO TUJUAN
  updates[`stock/${ke}/${stockSnapshot.firstKey}`] = {
    ...stockSnapshot.firstItem,
    qty: Number(stockSnapshot.firstItem.qty || 0) + q,
    updatedAt: Date.now(),
  };

  // ✅ UPDATE STATUS TRANSFER
  updates[`transfer_requests/${id}/status`] = "Approved";
  updates[`transfer_requests/${id}/approvedBy`] = performedBy;
  updates[`transfer_requests/${id}/approvedAt`] = new Date().toISOString();

  await update(ref(db), updates);
};

// ===================================================
// 🔥 APPROVE TRANSFER — REALTIME INVENTORY (FINAL)
// ===================================================
export const approveTransferAndMoveInventory = async ({
  transfer,
  performedBy,
}) => {
  const { id, dari, ke, imeis = [] } = transfer;

  if (!dari || !ke) {
    throw new Error("Toko asal / tujuan tidak valid");
  }
  if (!imeis.length) {
    throw new Error("IMEI kosong");
  }

  const invSnap = await get(ref(db, "inventory"));
  if (!invSnap.exists()) {
    throw new Error("Inventory kosong");
  }

  const updates = {};
  let moved = 0;

  invSnap.forEach((child) => {
    const row = child.val();

    if (imeis.includes(String(row.imei)) && String(row.toko) === String(dari)) {
      // 🔁 PINDAHKAN STOK (UNIT PER UNIT)
      updates[`inventory/${child.key}/toko`] = ke;
      updates[`inventory/${child.key}/updatedAt`] = new Date().toISOString();

      moved++;
    }
  });

  if (moved !== imeis.length) {
    throw new Error(
      `IMEI tidak lengkap di ${dari} (ditemukan ${moved}/${imeis.length})`
    );
  }

  // ✅ UPDATE STATUS TRANSFER
  updates[`transfer_requests/${id}/status`] = "Approved";
  updates[`transfer_requests/${id}/approvedBy`] = performedBy;
  updates[`transfer_requests/${id}/approvedAt`] = new Date().toISOString();

  await update(ref(db), updates);

  return true;
};

// ===================================================
// 🔐 RESERVE IMEI (ANTI DOUBLE TRANSFER)
// ===================================================
export const reserveImeis = async (imeis = [], toko) => {
  const snap = await get(ref(db, "inventory"));
  if (!snap.exists()) throw new Error("Inventory kosong");

  const updates = {};
  let reserved = 0;

  snap.forEach((child) => {
    const row = child.val();
    if (
      imeis.includes(String(row.imei)) &&
      row.toko === toko &&
      row.status === "AVAILABLE"
    ) {
      updates[`inventory/${child.key}/status`] = "RESERVED";
      reserved++;
    }
  });

  if (reserved !== imeis.length) {
    throw new Error("Sebagian IMEI sudah dipakai / tidak tersedia");
  }

  await update(ref(db), updates);
};

export const getMasterTokoById = async (tokoId) => {
  const snap = await get(ref(db, `masterToko/${tokoId}`));
  return snap.val();
};

// export const listenMasterToko = (callback) => {
//   const r = ref(db, "masterToko");
//   return onValue(r, (snap) => {
//     const val = snap.val() || {};
//     const list = Object.keys(val).map((id) => ({
//       id,
//       ...val[id],
//     }));
//     callback(list);
//   });
// };

// FirebaseService.js
// export const listenMasterToko = (cb) => {
//   return onValue(ref(db, "masterToko"), (snap) => {
//     const val = snap.val() || {};
//     cb(Object.entries(val).map(([id, v]) => ({ id, ...v })));
//   });
// };

/* =========================
   INIT MASTER HELPERS
========================= */

// MASTER PELANGGAN
// const masterPelanggan = createMasterHelpers("masterPelanggan");
// export const listenMasterPelanggan = masterPelanggan.listen;
// export const addMasterPelanggan = masterPelanggan.add;
// export const updateMasterPelanggan = masterPelanggan.update;
// export const deleteMasterPelanggan = masterPelanggan.delete;

// MASTER SALES
const masterSales = createMasterHelpers("masterSales");
export const listenMasterSales = masterSales.listen;
export const addMasterSales = masterSales.add;
export const updateMasterSales = masterSales.update;
export const deleteMasterSales = masterSales.delete;

// MASTER STORE HEAD (SH)
const masterStoreHead = createMasterHelpers("masterStoreHead");
export const listenMasterStoreHead = masterStoreHead.listen;
export const addMasterStoreHead = masterStoreHead.add;
export const updateMasterStoreHead = masterStoreHead.update;
export const deleteMasterStoreHead = masterStoreHead.delete;

// MASTER STORE LEADER (SL)
const masterStoreLeader = createMasterHelpers("masterStoreLeader");
export const listenMasterStoreLeader = masterStoreLeader.listen;
export const addMasterStoreLeader = masterStoreLeader.add;
export const updateMasterStoreLeader = masterStoreLeader.update;
export const deleteMasterStoreLeader = masterStoreLeader.delete;

// MASTER SALES TITIPAN (ST)
const masterSalesTitipan = createMasterHelpers("masterSalesTitipan");
export const listenMasterSalesTitipan = masterSalesTitipan.listen;
export const addMasterSalesTitipan = masterSalesTitipan.add;
export const updateMasterSalesTitipan = masterSalesTitipan.update;
export const deleteMasterSalesTitipan = masterSalesTitipan.delete;

// MASTER TOKO
// MASTER TOKO
const masterToko = createMasterHelpers("masterToko");

export const listenMasterToko = masterToko.listen;
export const addMasterToko = masterToko.add;
export const updateMasterToko = masterToko.update;
export const deleteMasterToko = masterToko.delete;

// MASTER BARANG & HARGA
const masterBarangHarga = createMasterHelpers("masterBarangHarga");
export const listenMasterBarangHarga = masterBarangHarga.listen;
export const addMasterBarangHarga = masterBarangHarga.add;
export const updateMasterBarangHarga = masterBarangHarga.update;
export const deleteMasterBarangHarga = masterBarangHarga.delete;

// MASTER SUPPLIER
const masterSupplier = createMasterHelpers("masterSupplier");
export const listenMasterSupplier = masterSupplier.listen;
export const addMasterSupplier = masterSupplier.add;
export const updateMasterSupplier = masterSupplier.update;
export const deleteMasterSupplier = masterSupplier.delete;

// =======================
// MASTER PAYMENT GROUP
// Path: dataManagement/{masterName}
// =======================

const masterPaymentMetode = createMasterHelpers("masterPaymentMetode");
export const listenMasterPaymentMetode = masterPaymentMetode.listen;
export const addMasterPaymentMetode = masterPaymentMetode.add;
export const updateMasterPaymentMetode = masterPaymentMetode.update;
export const deleteMasterPaymentMetode = masterPaymentMetode.delete;

const masterLeasing = createMasterHelpers("masterLeasing");
export const listenMasterLeasing = masterLeasing.listen;
export const addMasterLeasing = masterLeasing.add;
export const updateMasterLeasing = masterLeasing.update;
export const deleteMasterLeasing = masterLeasing.delete;

const masterMDR = createMasterHelpers("masterMDR");
export const listenMasterMDR = masterMDR.listen;
export const addMasterMDR = masterMDR.add;
export const updateMasterMDR = masterMDR.update;
export const deleteMasterMDR = masterMDR.delete;

const masterTenor = createMasterHelpers("masterTenor");
export const listenMasterTenor = masterTenor.listen;
export const addMasterTenor = masterTenor.add;
export const updateMasterTenor = masterTenor.update;
export const deleteMasterTenor = masterTenor.delete;

const masterVoucher = createMasterHelpers("masterVoucher");
export const listenMasterVoucher = masterVoucher.listen;
export const addMasterVoucher = masterVoucher.add;
export const updateMasterVoucher = masterVoucher.update;
export const deleteMasterVoucher = masterVoucher.delete;

const masterBarang = createMasterHelpers("masterBarang");

export const addMasterBarang = masterBarang.add;
export const updateMasterBarang = masterBarang.update;
export const deleteMasterBarangMasing = masterBarang.delete;

// =======================
// MASTER HARGA
// =======================
const masterHarga = createMasterHelpers("masterHarga");

export const listenMasterHarga = masterHarga.listen;
export const addMasterHarga = masterHarga.add;
export const updateMasterHarga = masterHarga.update;
export const deleteMasterHarga = masterHarga.delete;

// =======================
// MASTER BARANG BUNDLING
// =======================
const masterBarangBundling = createMasterHelpers("masterBarangBundling");

export const listenMasterBarangBundling = masterBarangBundling.listen;
export const addMasterBarangBundling = masterBarangBundling.add;
export const updateMasterBarangBundling = masterBarangBundling.update;
export const deleteMasterBarangBundling = masterBarangBundling.delete;

/* ============================================================
   SEARCH INVENTORY BY NAMA BARANG (UNTUK NAMA BARANG SEARCH MODAL)
============================================================ */

/* ============================================================
   SUPER SEARCH — Nama Barang / Brand / Kategori / SKU
   Cepat, kompatibel semua toko, hasil akurat untuk modal search.
============================================================ */

export const getInventoryByName = async (keyword) => {
  if (!keyword) return [];

  keyword = keyword.toLowerCase().trim();

  try {
    const snap = await get(ref(db, "stock"));
    if (!snap.exists()) return [];

    const stock = snap.val();
    const results = [];

    Object.entries(stock).forEach(([tokoName, skuList]) => {
      if (!skuList) return;

      Object.entries(skuList).forEach(([sku, item]) => {
        if (!item) return;

        const nama = String(item.nama || item.namaBarang || "").toLowerCase();
        const brand = String(item.brand || item.namaBrand || "").toLowerCase();
        const kategori = String(
          item.kategori || item.kategoriBarang || ""
        ).toLowerCase();
        const imei = String(item.imei || "").toLowerCase();

        // MATCH LOGIC (lebih akurat)
        const match =
          nama.includes(keyword) ||
          brand.includes(keyword) ||
          kategori.includes(keyword) ||
          sku.toLowerCase().includes(keyword) ||
          imei.includes(keyword);

        if (match) {
          results.push({
            sku,
            namaBarang: item.nama || item.namaBarang || "",
            namaBrand: item.brand || item.namaBrand || "",
            kategoriBarang: item.kategori || item.kategoriBarang || "",
            imei: item.imei || "",
            hargaUnit: Number(item.hargaUnit || item.harga || 0),
            qty: 1, // default qty
            tokoName,
          });
        }
      });
    });

    return results;
  } catch (err) {
    console.error("getInventoryByName ERROR:", err);
    return [];
  }
};

export const listenStockByCategory = (tokoName, kategori, callback) => {
  return onValue(ref(db, `stock/${tokoName}/byKategori/${kategori}`), (snap) =>
    callback(snap.val() || [])
  );
};

export const listenStockByName = (tokoName, namaBarang, callback) => {
  return onValue(
    ref(db, `stock/${tokoName}/byNamaBarang/${namaBarang}`),
    (snap) => callback(snap.val() || [])
  );
};

export const getBundlingItems = async (sku) => {
  const snap = await get(ref(db, `bundling/${sku}`));
  return snap.val() || [];
};

export const listenMasterPembelian = (callback) => {
  const r = ref(db, "dataManagement/masterPembelian");
  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      const arr = Object.entries(raw).map(([id, item]) => ({
        id,
        ...item,
      }));
      callback(arr);
    },
    (err) => {
      console.error("listenMasterPembelian error:", err);
      callback([]);
    }
  );
  return () => unsub && unsub();
};

/* ============================================================
   DEFAULT EXPORT
============================================================ */
// ======================= DEFAULT EXPORT (UNTUK IMPORT FirebaseService) =======================
const FirebaseService = {
  addKaryawan,
  addMasterBarangHarga,
  addMasterPelanggan,
  addMasterSales,
  addMasterSalesTitipan,
  addMasterStoreHead,
  addMasterStoreLeader,
  addMasterSupplier,
  addMasterToko,
  addPenjualan,
  addStock,
  addTransaksi,
  addMasterBarang,
  adjustInventoryStock,
  createInventory,
  createTransferRequest,
  deleteKaryawan,
  deleteMasterBarang,
  deleteMasterBarangHarga,
  deleteMasterPelanggan,
  deleteMasterSales,
  deleteMasterSalesTitipan,
  deleteMasterStoreHead,
  deleteMasterStoreLeader,
  deleteMasterSupplier,
  deleteMasterToko,
  deletePenjualan,
  deleteTransaksi,
  deleteUserOnline,
  forceDeleteTransaksi,
  getAllUsersOnce,
  getInventoryItem,
  getStockForToko,
  getTokoName,
  listenAllTransaksi,
  listenKaryawan,
  listenMasterBarangHarga,
  listenMasterPelanggan,
  listenMasterSales,
  listenMasterSalesTitipan,
  listenMasterStoreHead,
  listenMasterStoreLeader,
  listenMasterSupplier,
  listenMasterToko,
  listenPenjualan,
  listenPenjualanHemat, // ✅ fungsi hemat-kuota baru
  listenStockAll,
  listenTransaksiByToko,
  listenTransaksiByTokoHemat, // ✅ fungsi hemat-kuota baru
  listenTransferRequests,
  listenUsers,
  potongStockMasterByImei,
  reduceStock,
  restoreStockByImeiRealtime,
  saveUserOnline,
  transferStock,
  returnStock,
  updateInventory,
  updateKaryawan,
  updateMasterBarangHarga,
  updateMasterPelanggan,
  updateMasterSales,
  updateMasterSalesTitipan,
  updateMasterStoreHead,
  updateMasterStoreLeader,
  updateMasterSupplier,
  updateMasterToko,
  updatePenjualan,
  updateTransaksi,
  updateTransferRequest,
  getStockTotalBySKU,
  pushNotification,
  approveTransferAndMoveStock,
  approveTransferSafe,
  approveTransferFINAL,
  approveTransferABSOLUTE,
  approveTransferAndMoveInventory,
  reserveImeis,
  // updateImeiStatus,
};

export default FirebaseService;
