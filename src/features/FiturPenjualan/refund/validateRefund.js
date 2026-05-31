// ======================================================
// VALIDATE REFUND
// GLOBAL REALTIME REFUND ENGINE
// ======================================================

import { ref, get, update, set, serverTimestamp } from "firebase/database";

import { db } from "../../../services/FirebaseInit";

// ======================================================
// NORMALIZE
// ======================================================

const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

const normalizeImei = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

// ======================================================
// VALIDATE REFUND
// ======================================================

export const validateRefund = async ({ row, rows = [], userLogin }) => {
  // ====================================================
  // VALIDASI AWAL
  // ====================================================

  if (!row) {
    throw new Error("Data refund tidak ditemukan");
  }

  // ====================================================
  // CARI TRANSAKSI
  // ====================================================

  const trx = rows.find((x) => normalize(x.invoice) === normalize(row.invoice));

  if (!trx) {
    throw new Error("Transaksi penjualan tidak ditemukan");
  }

  // ====================================================
  // GLOBAL REFUND CHECK
  // ====================================================

  const alreadyRefund =
    trx?.refundProcessed === true ||
    trx?.refundLocked === true ||
    trx?.deleted === true ||
    trx?.deletedFromPenjualan === true ||
    trx?.HIDE_FROM_PENJUALAN === true ||
    trx?.IS_REFUND === true ||
    normalize(trx?.STATUS) === "REFUND_DELETED" ||
    normalize(trx?.STATUS) === "REFUND" ||
    normalize(trx?.PAYMENT_METODE) === "REFUND" ||
    normalize(trx?.statusPembayaran) === "REFUND";

  if (alreadyRefund) {
    throw new Error("Refund sudah pernah diproses");
  }

  let fbData = {};

  // ====================================================
  // VALIDASI FIREBASE GLOBAL
  // ====================================================

  if (trx?.id && trx?.tokoId) {
    const trxRef = ref(db, `toko/${trx.tokoId}/transaksi/${trx.id}`);

    const snap = await get(trxRef);

    fbData = snap.val() || {};

    const firebaseLocked =
      fbData?.refundProcessed === true ||
      fbData?.refundLocked === true ||
      fbData?.deleted === true ||
      fbData?.deletedFromPenjualan === true ||
      fbData?.HIDE_FROM_PENJUALAN === true ||
      fbData?.IS_REFUND === true ||
      normalize(fbData?.STATUS) === "REFUND_DELETED" ||
      normalize(fbData?.PAYMENT_METODE) === "REFUND";

    // ============================================
    // 🔥 REFUND READY OVERRIDE
    // ============================================
    const refundReadyRealtime =
      fbData?.READY_RESALE === true ||
      fbData?.IS_REFUND === true ||
      fbData?.statusRefund === "READY_RESALE" ||
      String(fbData?.LAST_ACTION || fbData?.PAYMENT_METODE || "")
        .trim()
        .toUpperCase() === "REFUND";

    if (refundReadyRealtime) {
      console.log("♻️ REFUND READY REALTIME BYPASS", trx.invoice);

      fbData.refundLocked = false;
      fbData.refundProcessed = false;
    }

    console.log("FB DATA:", fbData);
    console.log("firebaseLocked:", firebaseLocked);
    console.log("refundReadyRealtime:", refundReadyRealtime);
    console.log("READY_RESALE =", fbData?.READY_RESALE);
    console.log("IS_REFUND =", fbData?.IS_REFUND);
    console.log("LAST_ACTION =", fbData?.LAST_ACTION);
    console.log("PAYMENT_METODE =", fbData?.PAYMENT_METODE);

    if (firebaseLocked && !refundReadyRealtime && fbData?.IS_REFUND !== true) {
      throw new Error("Refund sudah terkunci realtime");
    }
  }

  // ====================================================
  // 🔥 GLOBAL REFUND HISTORY
  // MULTI DEVICE LOCK
  // ====================================================

  const refundKey = normalize(trx.invoice);

  const refundHistoryRef = ref(db, `refund_history/${refundKey}`);

  const refundHistorySnap = await get(refundHistoryRef);

  // ====================================================
  // BLOCK DUPLIKAT REFUND
  // ====================================================

 

const allowRepeatRefund =
  fbData?.READY_RESALE === true ||
  fbData?.IS_REFUND === true ||
  String(
    fbData?.LAST_ACTION ||
    fbData?.PAYMENT_METODE ||
    ""
  )
    .trim()
    .toUpperCase() === "REFUND";

if (
  refundHistorySnap.exists() &&
  !allowRepeatRefund
) {
  throw new Error(
    "Refund invoice sudah pernah diproses"
  );
}

  // ====================================================
  // SAVE REFUND HISTORY
  // ====================================================

  await update(refundHistoryRef, {
    invoice: trx.invoice || "",

    toko: trx.toko || "",

    tokoId: trx.tokoId || "",

    refundAt: Date.now(),

    refundAtServer: serverTimestamp(),

    refundBy: userLogin?.username || userLogin?.nama || "SYSTEM",

    STATUS: "REFUND_LOCKED",

    PAYMENT_METODE: "REFUND",

    refundProcessed: true,

    refundLocked: true,

    deleted: true,

    deletedFromPenjualan: true,

    HIDE_FROM_PENJUALAN: true,

    IS_REFUND: true,

    GLOBAL_REALTIME_LOCK: true,

    MULTI_DEVICE_LOCK: true,

    LOCALHOST_SYNC: true,

    VERCEL_SYNC: true,
  });

  // ====================================================
  // 🔥 HARD LOCK TABLE PENJUALAN
  // ====================================================

  if (trx?.id && trx?.tokoId) {
    const penjualanRef = ref(db, `toko/${trx.tokoId}/transaksi/${trx.id}`);

    await update(penjualanRef, {
      refundProcessed: true,

      refundLocked: true,

      deleted: true,

      deletedFromPenjualan: true,

      HIDE_FROM_PENJUALAN: true,

      IS_REFUND: true,

      STATUS: "REFUND_DELETED",

      PAYMENT_METODE: "REFUND",

      statusPembayaran: "REFUND",

      GLOBAL_REALTIME_LOCK: true,

      MULTI_DEVICE_LOCK: true,

      LOCALHOST_SYNC: true,

      VERCEL_SYNC: true,

      updatedAt: Date.now(),

      updatedAtServer: serverTimestamp(),
    });
  }

  // ====================================================
  // 🔥 LOCK IMEI REALTIME
  // AGAR TIDAK DOUBLE REFUND
  // ====================================================

  const items = Array.isArray(trx.items) ? trx.items : [];

  for (const item of items) {
    // ================================================
    // IMEI
    // ================================================

    if (Array.isArray(item.imeiList) && item.imeiList.length > 0) {
      for (const imeiRaw of item.imeiList) {
        const imei = normalizeImei(imeiRaw);

        if (!imei) continue;

        const imeiRefundRef = ref(db, `imei_refund_lock/${imei}`);

        const imeiSnap = await get(imeiRefundRef);

        const stockSnapRefund = await get(ref(db, `detail_stock/${imei}`));

        const stockData = stockSnapRefund.val() || {};

        const refundReadyIMEI =
          stockData?.READY_RESALE === true ||
          stockData?.IS_REFUND === true ||
          stockData?.LAST_ACTION === "REFUND";

        if (imeiSnap.exists() && refundReadyIMEI) {
          console.log("🔓 AUTO RELEASE REFUND LOCK", imei);

          await set(imeiRefundRef, null);
        }

        // ============================================
        // BLOCK DOUBLE REFUND IMEI
        // ============================================
        const stockSnapCheck = await get(ref(db, `detail_stock/${imei}`));

        const stockDataCheck = stockSnapCheck.val() || {};

        const canReuse =
          stockDataCheck?.READY_RESALE === true ||
          stockDataCheck?.IS_REFUND === true ||
          normalize(stockDataCheck?.LAST_ACTION) === "REFUND";

        if (imeiSnap.exists() && !canReuse) {
          throw new Error(`IMEI ${imei} sudah pernah direfund`);
        }

        if (imeiSnap.exists() && canReuse) {
          await set(imeiRefundRef, null);
        }

        // ============================================
        // SAVE IMEI LOCK
        // ============================================

        await set(imeiRefundRef, {
          imei,

          invoice: trx.invoice || "",

          refundAt: Date.now(),

          refundBy: userLogin?.username || userLogin?.nama || "SYSTEM",

          STATUS: "REFUND_LOCKED",
        });
      }
    }

    // ================================================
    // NON IMEI LOCK
    // ================================================
    else {
      const brand = normalize(item.namaBrand);

      const barang = normalize(item.namaBarang);

      const qty = Number(item.qty || item.QTY || 0);

      const nonImeiKey =
      `${refundKey}_${brand}_${barang}_${qty}`;

      const nonImeiRef = ref(db, `non_imei_refund_lock/${nonImeiKey}`);

      const nonImeiSnap = await get(nonImeiRef);

      // ============================================
      // BLOCK DOUBLE NON IMEI
      // ============================================

      const nonImeiData =
      nonImeiSnap.val() || {};
    
    const allowRepeatRefund =
      fbData?.READY_RESALE === true ||
      fbData?.IS_REFUND === true ||
      normalize(
        fbData?.LAST_ACTION ||
        fbData?.PAYMENT_METODE
      ) === "REFUND";
    
    if (
      nonImeiSnap.exists() &&
      !allowRepeatRefund
    ) {
      throw new Error(
        `${barang} sudah pernah direfund`
      );
    }

    if (
      nonImeiSnap.exists() &&
      allowRepeatRefund
    ) {
      console.log(
        "♻️ RELEASE NON IMEI LOCK",
        barang
      );
    
      await set(nonImeiRef, null);
    }

      // ============================================
      // SAVE NON IMEI LOCK
      // ============================================

      await set(nonImeiRef, {
        invoice: trx.invoice || "",

        namaBrand: item.namaBrand || "",

        namaBarang: item.namaBarang || "",

        qty,

        refundAt: Date.now(),

        refundBy: userLogin?.username || userLogin?.nama || "SYSTEM",

        STATUS: "REFUND_LOCKED",
      });
    }
  }

  // ====================================================
  // 🔥 LOCAL STORAGE BLACKLIST
  // ====================================================

  try {
    const oldBlacklist = JSON.parse(
      localStorage.getItem("refundBlacklist") || "[]"
    );

    const newBlacklist = [
      ...new Set([...oldBlacklist, normalize(trx.invoice)]),
    ];

    localStorage.setItem("refundBlacklist", JSON.stringify(newBlacklist));
  } catch (err) {
    console.log("BLACKLIST ERROR:", err.message);
  }

  // ====================================================
  // 🔥 GLOBAL DELETE CACHE
  // ====================================================

  try {
    if (trx?.id) {
      await update(ref(db, `penjualan/${trx.id}`), {
        deleted: true,

        refundProcessed: true,

        HIDE_FROM_PENJUALAN: true,

        STATUS: "REFUND_DELETED",
      });
    }

    if (trx?.trxKey) {
      await update(ref(db, `penjualan/${trx.trxKey}`), {
        deleted: true,

        refundProcessed: true,

        HIDE_FROM_PENJUALAN: true,

        STATUS: "REFUND_DELETED",
      });
    }
  } catch (err) {
    console.log("GLOBAL DELETE CACHE:", err.message);
  }

  // ====================================================
  // SUCCESS
  // ====================================================

  return {
    success: true,

    trx,
  };
};

export const canReuseRefundItem = (stock = {}) => {
  const readyResale = stock?.READY_RESALE === true;

  const isRefund = stock?.IS_REFUND === true;

  const lastAction = String(stock?.LAST_ACTION || stock?.PAYMENT_METODE || "")
    .trim()
    .toUpperCase();

  return readyResale || isRefund || lastAction === "REFUND";
};
