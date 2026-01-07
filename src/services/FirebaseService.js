/**
 * =========================================================
 * 🔥 SINGLE SOURCE OF TRUTH — STOCK SYSTEM
 * =========================================================
 * ❌ JANGAN gunakan fungsi berikut untuk stok:
 * - addStock
 * - reduceStock
 * - updateStockAtomic
 * - adjustInventoryStock
 * - transferStock
 *
 * ❌ JANGAN membaca stok dari:
 * - /stock
 * - /inventory
 *
 * ✅ STOK HANYA DIHITUNG DARI:
 *    /toko/{tokoId}/transaksi
 *
 * ✅ Perhitungan stok:
 *    src/utils/stockUtils.js
 *
 * FirebaseService hanya:
 * - menulis transaksi
 * - lock IMEI
 * - CRUD data
 */


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


/**
 * ===============================
 * UPDATE USER ACCOUNT (USERNAME & PASSWORD)
 * ===============================
 * @param {string} userId
 * @param {{username: string, password: string}} payload
 */
export const updateUserAccount = async (username, payload) => {
  if (!username) throw new Error("Username tidak valid");

  const userRef = ref(db, `users/${username}`);

  await update(userRef, {
    password: payload.password,
    updatedAt: new Date().toISOString(),
  });
};

/**
 * =====================================
 * RENAME USERNAME (KEY = USERNAME)
 * =====================================
 */
export const renameUsername = async (
  oldUsername,
  newUsername,
  newPassword
) => {
  if (!oldUsername || !newUsername) {
    throw new Error("Username tidak valid");
  }

  const oldRef = ref(db, `users/${oldUsername}`);
  const newRef = ref(db, `users/${newUsername}`);

  // 1️⃣ Ambil data lama
  const snap = await get(oldRef);
  if (!snap.exists()) {
    throw new Error("User lama tidak ditemukan");
  }

  // 2️⃣ Cek username baru sudah ada atau belum
  const checkNew = await get(newRef);
  if (checkNew.exists()) {
    throw new Error("Username baru sudah digunakan");
  }

  const oldData = snap.val();

  // 3️⃣ Buat data baru
  const newData = {
    ...oldData,
    username: newUsername,
    password: newPassword || oldData.password,
    updatedAt: new Date().toISOString(),
  };

  // 4️⃣ Simpan ke key baru
  await set(newRef, newData);

  // 5️⃣ Hapus key lama
  await remove(oldRef);
};


export const addTransferBarang = async (data) => {
  const transferRef = push(ref(db, "transfer_barang"));
  await update(transferRef, {
    ...data,
    id: transferRef.key,
    status: "Pending",
    createdAt: Date.now(),
  });
  return transferRef.key;
};



/* ===============================
   LOCK IMEI
=============================== */
export const lockImeiTransfer = async ({
  imei,
  transferId,
  tokoAsal,
}) => {
  const lockRef = ref(db, `imei_lock/${imei}`);
  const snap = await get(lockRef);

  if (snap.exists()) {
    throw new Error(`IMEI ${imei} sedang digunakan / terkunci`);
  }

  await set(lockRef, {
    status: "LOCKED",
    transferId,
    tokoAsal,
    createdAt: Date.now(),
  });
};

export const unlockImeiTransfer = async (imei) => {
  await remove(ref(db, `imei_lock/${imei}`));
};


export function getAvailableIMEIByToko(allTransaksi, tokoLogin) {
  const map = {};

  allTransaksi.forEach(t => {
    if (t.STATUS !== "Approved") return;
    if (!t.IMEI) return;

    const qty = 1;
    const key = t.IMEI;

    if (!map[key]) {
      map[key] = { imei: key, qty: 0, toko: t.NAMA_TOKO };
    }

    if (["PEMBELIAN", "TRANSFER_MASUK"].includes(t.PAYMENT_METODE)) {
      map[key].qty += qty;
    }

    if (["PENJUALAN", "TRANSFER_KELUAR"].includes(t.PAYMENT_METODE)) {
      map[key].qty -= qty;
    }
  });

  return Object.values(map).filter(
    i => i.qty > 0 && i.toko === tokoLogin
  );
}



/* =====================================================
   🔒 LOCK IMEI (ANTI DOUBLE JUAL)
===================================================== */
export const lockImei = async ({ imei, toko, invoice }) => {
  if (!imei || typeof imei !== "string") {
    throw new Error("IMEI tidak valid (harus string)");
  }

  const imeiKey = imei.trim();

  const imeiRef = ref(db, `penjualan_imei/${imeiKey}`);

  await set(imeiRef, {
    imei: imeiKey,
    toko,
    invoice,
    status: "LOCKED",
    lockedAt: Date.now(),
  });
};



/* =====================================================
   ✅ FINAL SOLD
===================================================== */
export const markImeiSold = async ({ imei, invoice }) => {
  if (typeof imei !== "string" || !imei) {
    throw new Error("IMEI tidak valid saat SOLD");
  }

  return set(ref(db, `inventory_imei/${imei}`), {
    status: "SOLD",
    invoice,
    soldAt: Date.now(),
  });
};


export const unlockImei = async (imei) => {
  return update(ref(db, `inventory_imei/${imei}`), {
    status: "AVAILABLE",
    lockedBy: null,
    lockedAt: null,
  });
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
  const usersRef = ref(db, "users");

  return onValue(usersRef, (snap) => {
    const val = snap.val() || {};

    const list = Object.entries(val).map(([key, data]) => ({
      _key: key,        // 🔥 KEY = USERNAME
      ...data,
    }));

    callback(list);
  });
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

export const addPenjualan = async (tokoId, data) => {
  if (!tokoId) {
    throw new Error("tokoId wajib");
  }

  const r = ref(db, `toko/${tokoId}/penjualan`);
  const newRef = push(r);

  await set(newRef, {
    ...data,
    createdAt: Date.now(),
  });

  return newRef.key;
};


export const updatePenjualan = (id, data) => {
  return update(ref(db, `penjualan/${id}`), data);
};

export const deletePenjualan = (id) => {
  return remove(ref(db, `penjualan/${id}`));
};

// export const listenPenjualan = (callback) => {
//   const r = ref(db, "penjualan");

//   const unsub = onValue(
//     r,
//     (snap) => {
//       const raw = snap.val() || {};
//       const list = Object.entries(raw).map(([id, item]) => ({
//         id,
//         ...item,
//       }));

//       list.sort(
//         (a, b) =>
//           new Date(b.TANGGAL_TRANSAKSI || 0) -
//           new Date(a.TANGGAL_TRANSAKSI || 0)
//       );

//       callback(list);
//     },
//     (err) => {
//       console.error("listenPenjualan error:", err);
//       callback([]);
//     }
//   );

//   // ✅ SATU-SATUNYA RETURN (TIDAK UNREACHABLE)
//   return () => unsub && unsub();
// };

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
// ================= TRANSFER BARANG =================
// ================= CREATE TRANSFER REQUEST =================
export const createTransferRequest = async (data) => {
  return push(ref(db, "transfer_barang"), data);
};

// listen transfer requests (for admin)
export const listenTransferRequests = (callback) => {
  const r = ref(db, "transfer_barang");
  return onValue(r, (snap) => {
    const raw = snap.val() || {};
    const arr = Object.entries(raw).map(([id, v]) => ({
      id,
      ...v,
    }));
    callback(arr); // ⬅️ JANGAN FILTER
  });
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
  if (!tokoId) throw new Error("TOKO LOGIN WAJIB");

  const r = push(ref(db, `toko/${tokoId}/transaksi`));

  const payload = {
    ...data,
    id: r.key,
    tokoId,
    STATUS: data.STATUS || "Approved",
    TANGGAL_TRANSAKSI:
      data.TANGGAL_TRANSAKSI ||
      data.TANGGAL ||
      new Date().toISOString().slice(0, 10),
    createdAt: Date.now(),
  };

  await set(r, payload);
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

export const kurangiStokToko = async ({
  toko,
  namaBarang,
  qty,
  imeiList = [],
}) => {
  if (!toko || !namaBarang) {
    throw new Error("Parameter stok tidak lengkap");
  }

  // === AMBIL INVENTORY TOKO ===
  const stokRef = ref(db, `inventory/${toko}`);
  const snap = await get(stokRef);

  if (!snap.exists()) {
    throw new Error(`Stok toko ${toko} tidak ditemukan`);
  }

  const updates = {};

  snap.forEach((child) => {
    const row = child.val();

    // === MODE IMEI ===
    if (imeiList.length > 0) {
      if (imeiList.includes(String(row.imei))) {
        updates[`inventory/${toko}/${child.key}`] = {
          ...row,
          STATUS: "SOLD",
          status: "SOLD",
          soldAt: Date.now(),
        };
      }
    }

    // === MODE NON IMEI ===
    else if (row.namaBarang === namaBarang) {
      const sisa = Number(row.qty || 0) - Number(qty || 0);
      if (sisa < 0) {
        throw new Error(`Stok ${namaBarang} di ${toko} tidak mencukupi`);
      }

      updates[`inventory/${toko}/${child.key}/qty`] = sisa;
    }
  });

  // === EXECUTE UPDATE (REALTIME) ===
  await update(ref(db), updates);
};
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
// ================= APPROVE TRANSFER (FINAL & REALTIME) =================
// ================= APPROVE + SURAT JALAN =================
export const approveTransferFINAL = async ({ transfer }) => {
  const sjRef = push(ref(db, "surat_jalan"));

  await update(sjRef, {
    noSuratJalan: transfer.noSuratJalan,
    tanggal: transfer.tanggal,
    tokoPengirim: transfer.tokoPengirim,
    tokoTujuan: transfer.ke,
    pengirim: transfer.pengirim,
    barang: transfer.barang,
    qty: transfer.qty,
    imeis: transfer.imeis,
  });

  const {
    tokoPengirim,
    ke,
    imeis = [],
    brand,
    barang,
    kategori,
    noDo,
    noSuratJalan,
    tanggal,
    id,
  } = transfer;

  const approvedAt = Date.now();

  // ===============================
  // 1. UPDATE STATUS TRANSFER
  // ===============================
  await update(ref(db, `transfer_barang/${id}`), {
    status: "Approved",
    suratJalanId: sjRef.key,
    approvedAt,
  });

  // ===============================
  // 2. TRANSAKSI STOK
  // ===============================
  for (const imei of imeis) {
    // 🔻 STOK KELUAR (PENGIRIM)
    await push(
      ref(db, `toko/${tokoPengirim}/transaksi`),
      {
        TANGGAL_TRANSAKSI: tanggal,
        NO_INVOICE: noDo,
        NO_SURAT_JALAN: noSuratJalan,
        NAMA_TOKO: tokoPengirim,

        NAMA_BRAND: brand,
        NAMA_BARANG: barang,
        KATEGORI_BRAND: kategori,

        IMEI: imei,
        QTY: 1,

        PAYMENT_METODE: "TRANSFER_KELUAR",
        SYSTEM_PAYMENT: "SYSTEM",
        STATUS: "Approved",
        CREATED_AT: approvedAt,
      }
    );

    // 🔺 STOK MASUK (TUJUAN)
    await push(
      ref(db, `toko/${ke}/transaksi`),
      {
        TANGGAL_TRANSAKSI: tanggal,
        NO_INVOICE: noDo,
        NO_SURAT_JALAN: noSuratJalan,
        NAMA_TOKO: ke,

        NAMA_BRAND: brand,
        NAMA_BARANG: barang,
        KATEGORI_BRAND: kategori,

        IMEI: imei,
        QTY: 1,

        PAYMENT_METODE: "TRANSFER_MASUK",
        SYSTEM_PAYMENT: "SYSTEM",
        STATUS: "Approved",
        CREATED_AT: approvedAt,
      }
    );
  }

  return noSuratJalan;
};




export const editTransferFINAL = async (id, data) => {
  await update(ref(db, `transfer_barang/${id}`), {
    ...data,
    editedAt: Date.now(),
  });
};


// ================= REJECT TRANSFER =================
export const rejectTransferFINAL = async ({ transfer }) => {
  if (!transfer?.id) {
    throw new Error("Transfer ID tidak valid");
  }

  // 🔁 KEMBALIKAN IMEI KE TOKO ASAL
  for (const imei of transfer.imeis || []) {
    await update(ref(db, `inventory/${transfer.tokoPengirim}/${imei}`), {
      STATUS: "AVAILABLE",
      TRANSFER_ID: null,
      UPDATED_AT: Date.now(),
    });
  }

  // 🔄 UPDATE STATUS TRANSFER
  await update(ref(db, `transfer_barang/${transfer.id}`), {
    status: "Rejected",
    rejectedAt: Date.now(),
  });

  return true;
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

/* =========================
   MASTER TOKO (FINAL & CONSISTENT)
   Path: /masterToko
========================= */

/* =========================
   MASTER TOKO (FINAL)
   Path: /masterToko
========================= */

// LISTEN REALTIME
export const listenMasterToko = (cb) => {
  const r = ref(db, "masterToko");
  return onValue(r, (snap) => {
    const data = snap.val() || {};
    const rows = Object.entries(data).map(([id, v]) => ({
      id,
      nama: v.nama || "",
      alamat: v.alamat || "",
    }));
    cb(rows);
  });
};

// ADD
export const addMasterToko = async (data) => {
  const r = push(ref(db, "masterToko"));
  await set(r, {
    nama: data.nama.trim(),
    alamat: data.alamat?.trim() || "",
    createdAt: new Date().toISOString(),
  });
  return r.key;
};

// UPDATE
export const updateMasterToko = async (id, data) => {
  return update(ref(db, `masterToko/${id}`), {
    nama: data.nama.trim(),
    alamat: data.alamat?.trim() || "",
    updatedAt: new Date().toISOString(),
  });
};

// DELETE
export const deleteMasterToko = async (id) => {
  return remove(ref(db, `masterToko/${id}`));
};

export const getAvailableImeisFromInventory = async (toko, namaBarang) => {
  if (!toko || !namaBarang) return [];

  const snap = await get(ref(db, "inventory"));
  if (!snap.exists()) return [];

  const result = [];

  snap.forEach((child) => {
    const row = child.val();

    if (
      String(row.toko || row.NAMA_TOKO).toUpperCase() ===
        String(toko).toUpperCase() &&
      String(row.namaBarang || row.NAMA_BARANG).toUpperCase() ===
        String(namaBarang).toUpperCase() &&
      String(row.status || row.STATUS).toUpperCase() === "AVAILABLE" &&
      (row.imei || row.IMEI)
    ) {
      result.push(String(row.imei || row.IMEI));
    }
  });

  return result;
};

// ===============================
// CARI IMEI UNTUK PENJUALAN CEPAT
// ===============================
export const findImeiPenjualan = async (imei, tokoId) => {
  const snap = await get(ref(db, `toko/${tokoId}/transaksi`));
  if (!snap.exists()) return null;

  const data = snap.val();

  for (const key in data) {
    if (
      data[key].IMEI === imei &&
      data[key].STATUS === "Approved"
    ) {
      return {
        kategoriBarang: data[key].KATEGORI_BRAND,
        namaBrand: data[key].NAMA_BRAND,
        namaBarang: data[key].NAMA_BARANG,
        hargaUnit: data[key].HARGA_UNIT,
      };
    }
  }

  return null; // ⚠️ BOLEH null, TIDAK BOLEH alert
};

/**
 * ===============================
 * CEK IMEI SUDAH TERJUAL
 * ===============================
 */
export const isImeiSudahTerjual = async (imei) => {
  const snap = await get(ref(db, `penjualan_imei/${imei}`));
  return snap.exists();
};

/**
 * ===============================
 * LOCK IMEI SAAT PENJUALAN
 * ===============================
 */
export const lockImeiPenjualan = async (imei, payload) => {
  await set(ref(db, `penjualan_imei/${imei}`), {
    ...payload,
    status: "LOCKED",
    soldAt: Date.now(),
  });
};


export const approveTransferRequest = async (transfer) => {
  const { tokoPengirim, ke, imeis = [], qty, barang } = transfer;

  // === KATEGORI IMEI ===
  if (imeis.length) {
    for (const im of imeis) {
      // pindahkan inventory
      await update(ref(db, `inventory/${tokoPengirim}/${im}`), {
        STATUS: "TRANSFERRED",
      });

      await set(ref(db, `inventory/${ke}/${im}`), {
        ...transfer,
        STATUS: "AVAILABLE",
      });
    }
  }

  // === STOCK AGREGAT ===
  await updateStockAtomic(tokoPengirim, barang, -qty);

  await updateStockAtomic(ke, barang, qty);

  await update(ref(db, `transferRequests/${transfer.id}`), {
    status: "Approved",
    approvedAt: Date.now(),
  });
};

export const findImeiForPenjualan = async (imei, toko) => {
  if (!imei || !toko) return null;

  const snap = await get(ref(db, "toko"));
  if (!snap.exists()) return null;

  let found = null;

  snap.forEach((tokoSnap) => {
    const transaksiSnap = tokoSnap.child("transaksi");
    if (!transaksiSnap.exists()) return;

    transaksiSnap.forEach((trx) => {
      const v = trx.val();
      if (
        String(v.IMEI).trim() === String(imei).trim() &&
        String(v.NAMA_TOKO).toUpperCase() === String(toko).toUpperCase() &&
        String(v.PAYMENT_METODE).toUpperCase() === "PEMBELIAN" &&
        String(v.STATUS).toUpperCase() === "APPROVED"
      ) {
        found = {
          kategoriBarang: v.KATEGORI_BRAND,
          namaBrand: v.NAMA_BRAND,
          namaBarang: v.NAMA_BARANG,
          sku: v.SKU || "",
          hargaSRP: v.HARGA_SRP || v.HARGA_UNIT || 0,
          imei: v.IMEI,
        };
      }
    });
  });

  return found;
};


export const getImeiDetailByToko = async (namaToko, imei) => {
  if (!namaToko || !imei) return false;

  // 1️⃣ cek inventory_imei
  const snap = await get(ref(db, `inventory_imei/${imei}`));
  if (!snap.exists()) return false;

  const data = snap.val();

  // AVAILABLE → bebas dipakai
  if (data.status === "AVAILABLE") return true;

  // LOCKED / SOLD → HARUS MILIK TOKO YANG SAMA
  if (data.toko === namaToko) return true;

  return false;
};


export const lockImeiRealtime = async (imei, toko, user = {}) => {
  const r = ref(db, `imei_locks/${imei}`);
  const snap = await get(r);

  if (snap.exists()) {
    throw new Error("IMEI sedang dipakai user lain");
  }

  await set(r, {
    toko,
    by: user?.email || "SYSTEM",
    at: Date.now(),
  });
};


export const unlockImeiRealtime = async (imei) => {
  await remove(ref(db, `imei_locks/${imei}`));
};





/* =========================================================
   LIST IMEI TOKO (AUTOCOMPLETE SAAT KETIK)
   ========================================================= */
export const getImeiListByToko = async (namaToko, keyword = "") => {
  if (!namaToko) return [];

  const snap = await get(ref(db, "toko"));
  if (!snap.exists()) return [];

  const list = [];

  snap.forEach((tokoSnap) => {
    const transaksiSnap = tokoSnap.child("transaksi");
    transaksiSnap.forEach((trx) => {
      const v = trx.val();

      if (
        v?.STATUS === "Approved" &&
        v?.NAMA_TOKO === namaToko &&
        v?.IMEI &&
        String(v.IMEI).includes(keyword)
      ) {
        list.push(v.IMEI);
      }
    });
  });

  // Hilangkan duplikat
  return [...new Set(list)].slice(0, 20);
};

// =====================================================
// 🔥 LISTEN PENJUALAN (FINAL – AUTO TAMPIL DI TABLE)
// =====================================================
// 🔥 KHUSUS PENJUALAN
export const listenPenjualan = (callback) => {
  const r = ref(db, "toko");

  return onValue(r, (snap) => {
    const result = [];

    snap.forEach((tokoSnap) => {
      const penjualanSnap = tokoSnap.child("penjualan");
      if (!penjualanSnap.exists()) return;

      penjualanSnap.forEach((trx) => {
        result.push({
          id: trx.key,
          tokoId: tokoSnap.key,
          ...trx.val(),
        });
      });
    });

    callback(result);
  });
};



export const voidTransaksiPenjualan = async (penjualanId) => {
  const trxRef = ref(db, `penjualan/${penjualanId}`);
  const snap = await get(trxRef);

  if (!snap.exists()) {
    throw new Error("Data penjualan tidak ditemukan");
  }

  const trx = snap.val();
  const toko = trx.toko;
  const items = trx.items || [];

  /* ================= ROLLBACK ITEM ================= */
  for (const item of items) {
    const qty = Number(item.qty || 0);
    const sku = item.sku;

    /* 1️⃣ UNLOCK IMEI */
    if (Array.isArray(item.imeiList)) {
      for (const imei of item.imeiList) {
        if (!imei) continue;

        await update(ref(db, `inventory_imei/${imei}`), {
          status: "AVAILABLE",
          unlockedAt: Date.now(),
          unlockedBy: "VOID",
        });
      }
    }

    /* 2️⃣ ROLLBACK STOK TOKO */
    if (sku) {
      const stokRef = ref(db, `stock/${toko}/${sku}`);
      const stokSnap = await get(stokRef);
      const currentQty = stokSnap.exists()
        ? Number(stokSnap.val().qty || 0)
        : 0;

      await set(stokRef, {
        qty: currentQty + qty,
        updatedAt: Date.now(),
      });
    }
  }

  /* 3️⃣ UPDATE STATUS PENJUALAN */
  await update(trxRef, {
    statusPembayaran: "VOID",
    VOID_AT: Date.now(),
    VOID_BY: "SUPERADMIN",
  });

  return true;
};



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

export const transferBarangFinal = async ({
  tokoAsal,
  tokoTujuan,
  namaBarang,
  qty,
  payloadBase = {},
}) => {
  if (!tokoAsal || !tokoTujuan || !namaBarang || !qty) {
    throw new Error("Parameter transfer tidak lengkap");
  }

  // KELUAR
  await addTransaksi(tokoAsal, {
    ...payloadBase,
    PAYMENT_METODE: "TRANSFER_KELUAR",
    NAMA_BARANG: namaBarang,
    QTY: qty,
    STATUS: "Approved",
  });

  // MASUK
  await addTransaksi(tokoTujuan, {
    ...payloadBase,
    PAYMENT_METODE: "TRANSFER_MASUK",
    NAMA_BARANG: namaBarang,
    QTY: qty,
    STATUS: "Approved",
  });
};

// ================================
// 🔥 KURANGI STOK IMEI (FINAL)
// ================================
export async function kurangiStokImei({ tokoNama, imei }) {
  if (!tokoNama || !imei) {
    throw new Error("Parameter stok IMEI tidak lengkap");
  }

  const invRef = ref(db, `inventory/${tokoNama}/${imei}`);

  const snap = await get(invRef);
  if (!snap.exists()) {
    throw new Error(`IMEI ${imei} tidak ditemukan di stok ${tokoNama}`);
  }

  if (snap.val()?.STATUS !== "AVAILABLE") {
    throw new Error(`IMEI ${imei} tidak tersedia`);
  }

  await update(invRef, {
    STATUS: "OUT",
    UPDATED_AT: Date.now(),
  });
}


export async function ensureImeiInInventory({
  tokoNama,
  imei,
}) {
  if (!tokoNama || !imei) return;

  const invRef = ref(db, `inventory/${tokoNama}/${imei}`);
  const snap = await get(invRef);

  if (!snap.exists()) {
    await set(invRef, {
      STATUS: "AVAILABLE",
      CREATED_AT: Date.now(),
      SOURCE: "AUTO_FROM_TRANSAKSI",
    });
  }
}






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
  rejectTransferFINAL,
  approveTransferABSOLUTE,
  approveTransferAndMoveInventory,
  reserveImeis,
  // updateImeiStatus,
};

export default FirebaseService;
