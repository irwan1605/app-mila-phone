// ============================================================================
// FirebaseService.js — A1 PRO MAX (MODEL STOCK 2: IMEI PER NODE)
// FITUR MAKSIMAL: 
// - Auto Repair IMEI
// - Repair Master Stock by IMEI
// - Find IMEI Location Realtime
// - Realtime Transfer Approve / Reject / Void
// - Per-IMEI Stock Tracking
// - Sinkronisasi InventoryReport & TransferBarang
// ============================================================================

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
  query,
  orderByChild,
  limitToLast,
  startAt,
  endAt,
} from "firebase/database";

// ============================================================================
// 1. SAFE LIST HELPER
// ============================================================================
export const safeValToList = (snap) => {
  const v = snap.val();
  if (!v) return [];
  if (typeof v === "object" && !Array.isArray(v)) {
    return Object.entries(v).map(([id, item]) =>
      typeof item === "object" ? { id, ...item } : { id, value: item }
    );
  }
  return Array.isArray(v) ? v : [v];
};

// ============================================================================
// 2. SKU NORMALIZER — WAJIB UNTUK KONSISTENSI DATA
// ============================================================================
export const normalizeSku = (brand, barang) => {
  if (!brand || !barang) return "";
  return `${brand}_${barang}`.replace(/\s+/g, "_").toUpperCase();
};

// ============================================================================
// 3. VARIAN DETECTOR — UNTUK MODEL "64GB", "128GB", "4/64", "8/256"
// ============================================================================
export const normalizeVarian = (namaBarang) => {
  if (!namaBarang) return "DEFAULT";
  const str = namaBarang.toUpperCase();

  const gb = str.match(/(\d+)\s*GB/);
  if (gb) return `${gb[1]}GB`;

  const ramRom = str.match(/(\d+)\s*\/\s*(\d+)/);
  if (ramRom) return `${ramRom[1]}_${ramRom[2]}GB`;

  return "DEFAULT";
};

// ============================================================================
// 4. NORMALIZE TRANSAKSI
// ============================================================================
export const normalizeTransaksi = (id, row = {}, tokoId = null, tokoName = "") => {
  const fixed = {
    id: id || null,
    tokoId,
    TOKO: tokoName,
    ...row,
  };

  if (!fixed.TANGGAL_TRANSAKSI && fixed.TANGGAL) {
    fixed.TANGGAL_TRANSAKSI = fixed.TANGGAL;
  }

  if (fixed.QTY !== undefined) {
    fixed.QTY = Number(fixed.QTY);
  }

  return fixed;
};

// ============================================================================
// 5. LISTEN STOCK ALL (MODEL STOCK 2 — IMEI PER NODE)
// ============================================================================
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

// ============================================================================
// 6. FIND IMEI LOCATION — MENCARI IMEI ADA DI TOKO MANA
// ============================================================================
export const findImeiLocation = async (imei) => {
  if (!imei) return null;

  const snap = await get(ref(db, "stock"));
  if (!snap.exists()) return null;

  const data = snap.val();

  for (const toko of Object.keys(data)) {
    const tokoData = data[toko];
    for (const sku of Object.keys(tokoData)) {
      const skuData = tokoData[sku];

      // MODEL STOCK 2: IMEI adalah key
      if (imei in skuData) {
        return {
          toko,
          sku,
          ...skuData[imei],
        };
      }
    }
  }

  return null;
};

// ============================================================================
// 7. AUTO REPAIR IMEI — MEMPERBAIKI STOK PUSAT DARI TRANSAKSI
// ============================================================================
export const autoRepairIMEI = async () => {
  try {
    const snapToko = await get(ref(db, "toko"));
    const snapStock = await get(ref(db, "stock"));

    if (!snapToko.exists()) return;
    if (!snapStock.exists()) return;

    const transaksi = snapToko.val();
    const stock = snapStock.val();

    let repaired = 0;

    // loop transaksi pembelian pusat
    Object.entries(transaksi).forEach(([tokoId, tokoData]) => {
      if (!tokoData?.transaksi) return;

      Object.entries(tokoData.transaksi).forEach(([trxId, trx]) => {
        if (
          trx.PAYMENT_METODE === "PEMBELIAN" &&
          trx.NAMA_TOKO === "CILANGKAP PUSAT" &&
          trx.STATUS === "Approved"
        ) {
          const imei = String(trx.IMEI || "").trim();
          const brand = trx.NAMA_BRAND;
          const barang = trx.NAMA_BARANG;

          if (!imei || !brand || !barang) return;

          const sku = normalizeSku(brand, barang);

          // Jika stok pusat tidak memiliki IMEI ini → tambahkan
          if (!(imei in (stock["CILANGKAP PUSAT"]?.[sku] || {}))) {
            set(ref(db, `stock/CILANGKAP PUSAT/${sku}/${imei}`), {
              nama: barang,
              varian: normalizeVarian(barang),
              qty: 1,
              updatedAt: new Date().toISOString(),
            });
            repaired++;
          }
        }
      });
    });

    return repaired;
  } catch (err) {
    console.error("autoRepairIMEI ERROR:", err);
    return 0;
  }
};

// ============================================================================
// 8. REPAIR MASTER STOCK BY IMEI — MEMASTIKAN IMEI TIDAK HILANG / DUPLIKAT
// ============================================================================
export const repairMasterStockByImei = async (imei) => {
  if (!imei) return false;

  try {
    // Cari lokasi IMEI
    const loc = await findImeiLocation(imei);
    if (loc) return true; // sudah ada → aman

    // Jika hilang → cari dari transaksi pusat
    const snap = await get(ref(db, "toko"));
    if (!snap.exists()) return false;

    let trxFound = null;

    Object.values(snap.val()).forEach((toko) => {
      Object.values(toko.transaksi || {}).forEach((trx) => {
        if (
          trx.IMEI === imei &&
          trx.PAYMENT_METODE === "PEMBELIAN" &&
          trx.NAMA_TOKO === "CILANGKAP PUSAT"
        ) {
          trxFound = trx;
        }
      });
    });

    if (!trxFound) return false;

    const sku = normalizeSku(trxFound.NAMA_BRAND, trxFound.NAMA_BARANG);

    // Tulis ulang IMEI ke stok pusat
    await set(ref(db, `stock/CILANGKAP PUSAT/${sku}/${imei}`), {
      nama: trxFound.NAMA_BARANG,
      varian: normalizeVarian(trxFound.NAMA_BARANG),
      qty: 1,
      repairedAt: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.error("repairMasterStockByImei ERROR:", err);
    return false;
  }
};
// ============================================================================
// 9. LISTEN TRANSAKSI PER TOKO (FULL VERSION)
// ============================================================================
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

// ============================================================================
// 10. LISTEN TRANSAKSI PER TOKO — MODE HEMAT KUOTA
// ============================================================================
export const listenTransaksiByTokoHemat = (
  tokoId,
  options = {},
  callback
) => {
  const { limit = 200, startDate, endDate } = options || {};

  const baseRef = ref(db, `toko/${tokoId}/transaksi`);

  // Fallback ke listener biasa jika tanpa filter
  if (!limit && !startDate && !endDate) {
    return listenTransaksiByToko(tokoId, callback);
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
      const arr = Object.entries(raw).map(([id, item]) =>
        normalizeTransaksi(id, item, tokoId)
      );

      arr.sort(
        (a, b) =>
          new Date(b.TANGGAL_TRANSAKSI || 0) -
          new Date(a.TANGGAL_TRANSAKSI || 0)
      );

      callback(arr);
    },
    (err) => {
      console.error("listenTransaksiByTokoHemat error:", err);
      callback([]);
    }
  );

  return () => unsub && unsub();
};

// ============================================================================
// 11. ADD TRANSAKSI
// ============================================================================
export const addTransaksi = async (tokoId, data) => {
  const r = push(ref(db, `toko/${tokoId}/transaksi`));

  const payload = {
    ...data,
    TANGGAL_TRANSAKSI:
      data.TANGGAL_TRANSAKSI || data.TANGGAL || new Date().toISOString(),
    id: r.key,
  };

  await set(r, payload);
  return r.key;
};

// ============================================================================
// 12. UPDATE TRANSAKSI
// ============================================================================
export const updateTransaksi = (tokoId, id, data) => {
  return update(ref(db, `toko/${tokoId}/transaksi/${id}`), data);
};

// ============================================================================
// 13. DELETE TRANSAKSI
// ============================================================================
export const deleteTransaksi = (tokoId, id) => {
  return remove(ref(db, `toko/${tokoId}/transaksi/${id}`));
};

// ============================================================================
// 14. LISTEN ALL TRANSAKSI — MERGED ACROSS ALL TOKO
// ============================================================================
export const listenAllTransaksi = (callback) => {
  const r = ref(db, "toko");

  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      const merged = [];

      Object.entries(raw).forEach(([tokoId, tokoData]) => {
        const tokoName =
          (tokoData?.info?.name) ||
          tokoData?.name ||
          `TOKO ${tokoId}`;

        if (tokoData?.transaksi) {
          Object.entries(tokoData.transaksi).forEach(([id, row]) => {
            merged.push(
              normalizeTransaksi(id, row, tokoId, tokoName)
            );
          });
        }
      });

      // Sort dari tanggal terbaru ke lama
      merged.sort(
        (a, b) =>
          new Date(b.TANGGAL_TRANSAKSI || 0) -
          new Date(a.TANGGAL_TRANSAKSI || 0)
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

// ============================================================================
// 15. FORCE DELETE TRANSAKSI (UNTUK CLEANUP DATA TANPA ID)
// ============================================================================
export const forceDeleteTransaksi = async (tokoId, matchFn) => {
  try {
    const trxPath = `toko/${tokoId}/transaksi`;
    const snap = await get(ref(db, trxPath));

    if (!snap.exists()) return;

    const deletes = [];

    snap.forEach((child) => {
      const val = child.val();
      try {
        if (matchFn(val, child.key)) {
          deletes.push(remove(ref(db, `${trxPath}/${child.key}`)));
        }
      } catch (e) {
        console.warn("forceDeleteTransaksi error:", e);
      }
    });

    if (deletes.length) await Promise.all(deletes);
  } catch (err) {
    console.error("forceDeleteTransaksi error:", err);
  }
};

// ============================================================================
// 16. PENJUALAN
// ============================================================================
export const addPenjualan = (data) => {
  const r = push(ref(db, "penjualan"));
  return set(r, { ...data, id: r.key });
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
      const arr = Object.entries(raw).map(([id, item]) =>
        normalizeTransaksi(id, item)
      );

      arr.sort(
        (a, b) =>
          new Date(b.TANGGAL_TRANSAKSI || 0) -
          new Date(a.TANGGAL_TRANSAKSI || 0)
      );

      callback(arr);
    },
    (err) => {
      console.error("listenPenjualan error:", err);
      callback([]);
    }
  );

  return () => unsub && unsub();
};

// ============================================================================
// 17. LISTEN PENJUALAN HEMAT KUOTA
// ============================================================================
export const listenPenjualanHemat = (callback, options = {}) => {
  const { limit = 200, startDate, endDate } = options || {};

  const baseRef = ref(db, "penjualan");

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
      const arr = Object.entries(raw).map(([id, item]) =>
        normalizeTransaksi(id, item)
      );

      arr.sort(
        (a, b) =>
          new Date(b.TANGGAL_TRANSAKSI || 0) -
          new Date(a.TANGGAL_TRANSAKSI || 0)
      );

      callback(arr);
    },
    (err) => {
      console.error("listenPenjualanHemat error:", err);
      callback([]);
    }
  );

  return () => unsub && unsub();
};
// ============================================================================
// 18. LISTEN SELURUH STOK (REALTIME)
// ============================================================================
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

// ============================================================================
// 19. GET TOTAL STOCK BY SKU (MODEL 2 — IMEI PER NODE)
// ============================================================================
export const getStockTotalBySKU = async (toko, sku) => {
  const snap = await get(ref(db, `stock/${toko}/${sku}`));
  if (!snap.exists()) return 0;

  const data = snap.val();

  // Setiap IMEI = 1 stok
  return Object.keys(data).length;
};

// ============================================================================
// 20. ADD STOCK (MODEL 2 — IMEI PER NODE)
// ============================================================================
export const addStock = async (toko, sku, payload) => {
  if (!payload?.imei) return;

  const imei = String(payload.imei).trim();
  if (!imei) return;

  await set(ref(db, `stock/${toko}/${sku}/${imei}`), {
    imei,
    nama: payload.nama || "",
    varian: payload.varian || "",
    qty: 1,
    createdAt: new Date().toISOString(),
  });
};

// ============================================================================
// 21. REDUCE STOCK (MODEL 2 — IMEI PER NODE)
// ============================================================================
export const reduceStock = async (toko, sku, imeiList = []) => {
  if (!Array.isArray(imeiList)) {
    throw new Error("IMEI list must be an array");
  }

  for (const imei of imeiList) {
    const path = `stock/${toko}/${sku}/${imei}`;
    const snap = await get(ref(db, path));

    if (!snap.exists()) {
      console.warn("IMEI tidak ditemukan saat reduce:", imei);
      throw new Error(`Insufficient stock (IMEI ${imei} missing)`);
    }

    await remove(ref(db, path));
  }

  return true;
};

// ============================================================================
// 22. TRANSFER STOCK (MODEL 2 — IMEI PER NODE)
// ============================================================================
export const transferStock = async ({
  fromToko,
  toToko,
  sku,
  imeiList = [],
  nama = "",
  varian = "",
  keterangan = "",
  performedBy = "",
}) => {
  if (!imeiList.length) throw new Error("IMEI list kosong.");
  if (!fromToko || !toToko || !sku) throw new Error("Missing parameters");

  const timestamp = new Date().toISOString();

  // Kurangi dari toko asal
  await reduceStock(fromToko, sku, imeiList);

  // Tambahkan ke toko tujuan
  for (const im of imeiList) {
    await addStock(toToko, sku, {
      imei: im,
      nama,
      varian,
    });
  }

  // Catat riwayat transfer global
  const hist = push(ref(db, "transfer_history"));
  await set(hist, {
    from: fromToko,
    to: toToko,
    sku,
    imeiList,
    qty: imeiList.length,
    nama,
    varian,
    keterangan,
    performedBy,
    timestamp,
  });

  return true;
};

// ============================================================================
// 23. FIND IMEI LOCATION (MODEL 2)
// ============================================================================
export const findImeiLocation = async (imei) => {
  const snap = await get(ref(db, "stock"));
  if (!snap.exists()) return null;

  const stock = snap.val();

  for (const toko of Object.keys(stock)) {
    for (const sku of Object.keys(stock[toko])) {
      if (stock[toko][sku][imei]) {
        return {
          toko,
          sku,
          imei,
        };
      }
    }
  }

  return null; // tidak ditemukan
};

// ============================================================================
// 24. AUTO REPAIR STOK BERDASARKAN TRANSAKSI PEMBELIAN
//    *Menghubungkan MasterPembelian → Stock Model 2*
// ============================================================================
export const autoRepairIMEI = async () => {
  try {
    const tokoSnap = await get(ref(db, "toko"));
    if (!tokoSnap.exists()) return;

    const tokoData = tokoSnap.val();

    // Loop semua transaksi pembelian
    for (const [tokoId, toko] of Object.entries(tokoData)) {
      if (!toko.transaksi) continue;

      for (const [trxId, trx] of Object.entries(toko.transaksi)) {
        if (trx.PAYMENT_METODE !== "PEMBELIAN") continue;
        if (!trx.IMEI) continue;

        const sku = normalizeSku(trx.NAMA_BRAND, trx.NAMA_BARANG);
        const imei = String(trx.IMEI).trim();
        const tokoName = trx.NAMA_TOKO;

        if (!sku || !tokoName) continue;

        // cek stok model 2
        const existing = await get(
          ref(db, `stock/${tokoName}/${sku}/${imei}`)
        );

        if (!existing.exists()) {
          console.log("AUTO-REPAIR: menambahkan IMEI hilang:", imei);
          await addStock(tokoName, sku, {
            imei,
            nama: trx.NAMA_BARANG,
            varian: normalizeVarian(trx.NAMA_BARANG),
          });
        }
      }
    }

    console.log("AUTO-REPAIR IMEI selesai.");
  } catch (err) {
    console.error("AUTO-REPAIR ERROR:", err);
  }
};

// ============================================================================
// 25. REPAIR STOK MASTER BERDASARKAN IMEI
// ============================================================================
export const repairMasterStockByImei = async (imei) => {
  const trxSnap = await get(ref(db, "toko"));
  if (!trxSnap.exists()) return;

  let found = false;

  trxSnap.forEach((tokoSnap) => {
    tokoSnap.child("transaksi").forEach((child) => {
      const val = child.val();

      if (
        String(val.IMEI || "").trim() === String(imei).trim() &&
        val.PAYMENT_METODE === "PEMBELIAN" &&
        val.STATUS === "Approved"
      ) {
        const sku = normalizeSku(val.NAMA_BRAND, val.NAMA_BARANG);

        addStock(val.NAMA_TOKO, sku, {
          imei,
          nama: val.NAMA_BARANG,
          varian: normalizeVarian(val.NAMA_BARANG),
        });

        found = true;
      }
    });
  });

  return found;
};
// ============================================================================
// 26. TRANSFER REQUEST (PENGAJUAN DARI TOKO)
// ============================================================================
export const createTransferRequest = async (payload) => {
  const r = push(ref(db, "transfer_requests"));
  await set(r, {
    ...payload,
    id: r.key,
    status: "Pending",
    createdAt: new Date().toISOString(),
  });
  return r.key;
};

// ============================================================================
// 27. LISTEN TRANSFER REQUESTS (UNTUK SUPERADMIN)
// ============================================================================
export const listenTransferRequests = (callback) => {
  const r = ref(db, "transfer_requests");

  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};

      const arr = Object.entries(raw)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      callback(arr);
    },
    (err) => {
      console.error("listenTransferRequests error:", err);
      callback([]);
    }
  );

  return () => unsub && unsub();
};

// ============================================================================
// 28. APPROVE TRANSFER (SUPERADMIN)
// ============================================================================
export const approveTransferRequestRealtime = async (req) => {
  const {
    id,
    fromToko,
    toToko,
    sku,
    imeiList = [],
    nama,
    varian,
    requestedBy,
  } = req;

  if (!imeiList.length) throw new Error("IMEI list kosong");
  if (!fromToko || !toToko || !sku) throw new Error("Invalid data");

  // Step 1: Kurangi stok toko asal
  for (const imei of imeiList) {
    const exist = await get(ref(db, `stock/${fromToko}/${sku}/${imei}`));
    if (!exist.exists()) {
      throw new Error(`IMEI ${imei} tidak ditemukan di ${fromToko}`);
    }
  }

  for (const imei of imeiList) {
    await remove(ref(db, `stock/${fromToko}/${sku}/${imei}`));
  }

  // Step 2: Tambahkan ke toko tujuan
  for (const imei of imeiList) {
    await set(ref(db, `stock/${toToko}/${sku}/${imei}`), {
      imei,
      nama,
      varian,
      qty: 1,
      createdAt: new Date().toISOString(),
    });
  }

  // Step 3: Update request status
  await update(ref(db, `transfer_requests/${id}`), {
    status: "Approved",
    approvedAt: new Date().toISOString(),
  });

  // Step 4: Catat history
  const h = push(ref(db, "transfer_history"));
  await set(h, {
    from: fromToko,
    to: toToko,
    sku,
    imeiList,
    qty: imeiList.length,
    nama,
    varian,
    requestedBy,
    approvedAt: new Date().toISOString(),
    status: "Approved",
  });

  return true;
};

// ============================================================================
// 29. REJECT TRANSFER
// ============================================================================
export const rejectTransferRequestRealtime = async (id, reason) => {
  await update(ref(db, `transfer_requests/${id}`), {
    status: "Rejected",
    reason: reason || "Tidak disetujui",
    rejectedAt: new Date().toISOString(),
  });

  return true;
};

// ============================================================================
// 30. VOID TRANSFER (MENGEMBALIKAN IMEI KE TOKO ASAL)
// ============================================================================
export const voidTransfer = async (historyId) => {
  const snap = await get(ref(db, `transfer_history/${historyId}`));
  if (!snap.exists()) throw new Error("Transfer history tidak ditemukan");

  const data = snap.val();
  const { from, to, sku, imeiList, nama, varian } = data;

  if (!imeiList?.length) throw new Error("IMEI list kosong pada history");

  // Step 1: Hapus dari toko tujuan
  for (const imei of imeiList) {
    const exist = await get(ref(db, `stock/${to}/${sku}/${imei}`));
    if (exist.exists()) {
      await remove(ref(db, `stock/${to}/${sku}/${imei}`));
    }
  }

  // Step 2: Kembalikan IMEI ke toko asal
  for (const imei of imeiList) {
    await set(ref(db, `stock/${from}/${sku}/${imei}`), {
      imei,
      nama,
      varian,
      qty: 1,
      restoredAt: new Date().toISOString(),
    });
  }

  // Step 3: tandai history VOID
  await update(ref(db, `transfer_history/${historyId}`), {
    status: "VOID",
    voidAt: new Date().toISOString(),
  });

  return true;
};
// ============================================================================
// 31. AUTO-GENERATE ID PELANGGAN (PLG-001, dst) + HARD-LOCK ANTI DUPLIKAT
// ============================================================================

const generateNextPelangganId = async () => {
  const counterRef = ref(db, "counters/masterPelanggan");

  const result = await runTransaction(counterRef, (current) => {
    return Number(current || 0) + 1;
  });

  const next = result.snapshot.val();
  return `PLG-${String(next).padStart(3, "0")}`;
};

const checkDuplicateIdPelanggan = async (idPelanggan) => {
  const snap = await get(ref(db, "dataManagement/masterPelanggan"));
  if (!snap.exists()) return false;

  const data = snap.val();
  return Object.values(data).some(
    (item) => String(item.idPelanggan) === String(idPelanggan)
  );
};

// ============================================================================
// 32. MASTER PELANGGAN
// ============================================================================

export const listenMasterPelanggan = (callback) => {
  const r = ref(db, "dataManagement/masterPelanggan");
  const unsub = onValue(
    r,
    (snap) => {
      const raw = snap.val() || {};
      callback(
        Object.entries(raw).map(([id, v]) => ({
          id,
          ...v,
        }))
      );
    },
    () => callback([])
  );
  return () => unsub && unsub();
};

export const addMasterPelanggan = async (data) => {
  const newId = await generateNextPelangganId();

  const duplicate = await checkDuplicateIdPelanggan(newId);
  if (duplicate) throw new Error("ID Pelanggan duplikat!");

  const r = push(ref(db, "dataManagement/masterPelanggan"));
  await set(r, {
    ...data,
    id: r.key,
    idPelanggan: newId,
    createdAt: new Date().toISOString(),
  });

  return r.key;
};

export const updateMasterPelanggan = async (id, data) => {
  if (data.idPelanggan) {
    const duplicate = await checkDuplicateIdPelanggan(data.idPelanggan);
    if (duplicate) throw new Error("ID Pelanggan duplikat!");
  }

  await update(ref(db, `dataManagement/masterPelanggan/${id}`), {
    ...data,
    updatedAt: new Date().toISOString(),
  });

  return true;
};

export const deleteMasterPelanggan = async (id) => {
  await remove(ref(db, `dataManagement/masterPelanggan/${id}`));
  return true;
};

// ============================================================================
// 33. MASTER HELPER GENERATOR (GENERIC CRUD)
//  → digunakan untuk master barang, sales, supplier, dll.
// ============================================================================

const createMasterHelpers = (masterName) => {
  const basePath = `dataManagement/${masterName}`;

  return {
    listen: (callback) => {
      const r = ref(db, basePath);
      const unsub = onValue(
        r,
        (snap) => {
          const raw = snap.val() || {};
          const arr = Object.entries(raw).map(([id, val]) => ({
            id,
            ...val,
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

// ============================================================================
// 34. INISIASI MASTER MANAGEMENT
// ============================================================================

// MASTER SALES
const masterSales = createMasterHelpers("masterSales");
export const listenMasterSales = masterSales.listen;
export const addMasterSales = masterSales.add;
export const updateMasterSales = masterSales.update;
export const deleteMasterSales = masterSales.delete;

// MASTER SALES TITIPAN
const masterSalesTitipan = createMasterHelpers("masterSalesTitipan");
export const listenMasterSalesTitipan = masterSalesTitipan.listen;
export const addMasterSalesTitipan = masterSalesTitipan.add;
export const updateMasterSalesTitipan = masterSalesTitipan.update;
export const deleteMasterSalesTitipan = masterSalesTitipan.delete;

// MASTER STORE HEAD
const masterStoreHead = createMasterHelpers("masterStoreHead");
export const listenMasterStoreHead = masterStoreHead.listen;
export const addMasterStoreHead = masterStoreHead.add;
export const updateMasterStoreHead = masterStoreHead.update;
export const deleteMasterStoreHead = masterStoreHead.delete;

// MASTER STORE LEADER
const masterStoreLeader = createMasterHelpers("masterStoreLeader");
export const listenMasterStoreLeader = masterStoreLeader.listen;
export const addMasterStoreLeader = masterStoreLeader.add;
export const updateMasterStoreLeader = masterStoreLeader.update;
export const deleteMasterStoreLeader = masterStoreLeader.delete;

// MASTER TOKO
const masterToko = createMasterHelpers("masterToko");
export const listenMasterToko = masterToko.listen;
export const addMasterToko = masterToko.add;
export const updateMasterToko = masterToko.update;
export const deleteMasterToko = masterToko.delete;

// MASTER SUPPLIER
const masterSupplier = createMasterHelpers("masterSupplier");
export const listenMasterSupplier = masterSupplier.listen;
export const addMasterSupplier = masterSupplier.add;
export const updateMasterSupplier = masterSupplier.update;
export const deleteMasterSupplier = masterSupplier.delete;

// MASTER BARANG HARGA
const masterBarangHarga = createMasterHelpers("masterBarangHarga");
export const listenMasterBarangHarga = masterBarangHarga.listen;
export const addMasterBarangHarga = masterBarangHarga.add;
export const updateMasterBarangHarga = masterBarangHarga.update;
export const deleteMasterBarangHarga = masterBarangHarga.delete;

// ============================================================================
// 35. MASTER BARANG (KHUSUS PATH STOCK LEGACY)
// ============================================================================
export const listenMasterBarang = (callback) => {
  const r = ref(db, "dataManagement/masterBarang");

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
      console.error("listenMasterBarang error:", err);
      callback([]);
    }
  );

  return () => unsub && unsub();
};

// OPTIONAL DELETE STOCK MASTER
export const deleteMasterBarang = async (brand, barang) => {
  const sku = normalizeSku(brand, barang);
  return remove(ref(db, `stock/${brand}/${sku}`));
};

// ============================================================================
// 36. LISTEN INVENTORY REPORT (GLOBAL INVENTORY)
// ============================================================================
export const listenInventoryReport = (namaToko, callback) => {
  return onValue(
    ref(db, "inventory"),
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
// ============================================================================
// 37. FINAL EXPORT — FirebaseService (NO DUPLICATES, NO MISSING FUNCTIONS)
// ============================================================================

const FirebaseService = {
  // Helpers
  safeValToList,
  normalizeSku,
  normalizeVarian,
  normalizeTransaksi,

  // Stock model 2 engines
  listenStockAll,
  getStockTotalBySKU,
  addStock,
  reduceStock,
  transferStock,
  findImeiLocation,
  autoRepairIMEI,
  repairMasterStockByImei,

  // Transaksi
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
  listenTransaksiByToko,
  listenTransaksiByTokoHemat,
  listenAllTransaksi,

  // Transfer request / approval / reject / void
  createTransferRequest,
  listenTransferRequests,
  approveTransferRequestRealtime,
  rejectTransferRequestRealtime,
  voidTransfer,

  // Users
  saveUserOnline,
  deleteUserOnline,
  listenUsers,
  getAllUsersOnce,

  // Inventory wrappers
  getInventoryItem,
  updateInventory,
  createInventory,
  adjustInventoryStock,
  listenInventoryReport,

  // Karyawan
  listenKaryawan,
  addKaryawan,
  updateKaryawan,
  deleteKaryawan,

  // Master Barang
  listenMasterBarang,
  deleteMasterBarang,

  // Master Barang Harga
  listenMasterBarangHarga,
  addMasterBarangHarga,
  updateMasterBarangHarga,
  deleteMasterBarangHarga,

  // Master Pelanggan
  listenMasterPelanggan,
  addMasterPelanggan,
  updateMasterPelanggan,
  deleteMasterPelanggan,

  // Master Sales
  listenMasterSales,
  addMasterSales,
  updateMasterSales,
  deleteMasterSales,

  // Master Sales Titipan
  listenMasterSalesTitipan,
  addMasterSalesTitipan,
  updateMasterSalesTitipan,
  deleteMasterSalesTitipan,

  // Master Store Head
  listenMasterStoreHead,
  addMasterStoreHead,
  updateMasterStoreHead,
  deleteMasterStoreHead,

  // Master Store Leader
  listenMasterStoreLeader,
  addMasterStoreLeader,
  updateMasterStoreLeader,
  deleteMasterStoreLeader,

  // Master Toko
  listenMasterToko,
  addMasterToko,
  updateMasterToko,
  deleteMasterToko,

  // Master Supplier
  listenMasterSupplier,
  addMasterSupplier,
  updateMasterSupplier,
  deleteMasterSupplier,
};

export default FirebaseService;
