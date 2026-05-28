// ======================================================
// VALIDATE REFUND
// GLOBAL REALTIME REFUND VALIDATOR
// ======================================================

import { ref, get, update } from "firebase/database";

import { db } from "../../../services/FirebaseInit";

// ======================================================
// NORMALIZE
// ======================================================

const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

// ======================================================
// VALIDATE REFUND
// ======================================================

export const validateRefund = async ({ row, rows = [], userLogin }) => {
  // ====================================================
  // VALIDASI DATA
  // ====================================================

  if (!row) {
    throw new Error("Data refund tidak ditemukan");
  }

  // ====================================================
  // CARI TRANSAKSI ASLI
  // ====================================================

  const trx = rows.find((x) => normalize(x.invoice) === normalize(row.invoice));

  if (!trx) {
    throw new Error("Transaksi penjualan tidak ditemukan");
  }

  // ====================================================
  // CEK REFUND GLOBAL
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
    throw new Error("Refund sudah diproses sebelumnya");
  }

  // ====================================================
  // VALIDASI FIREBASE REALTIME
  // ====================================================

  if (trx?.id && trx?.tokoId) {
    const trxRef = ref(db, `toko/${trx.tokoId}/transaksi/${trx.id}`);

    const snap = await get(trxRef);

    const fbData = snap.val() || {};

    const firebaseLocked =
      fbData?.refundProcessed === true ||
      fbData?.refundLocked === true ||
      fbData?.deleted === true ||
      fbData?.deletedFromPenjualan === true ||
      fbData?.HIDE_FROM_PENJUALAN === true ||
      fbData?.IS_REFUND === true ||
      normalize(fbData?.STATUS) === "REFUND_DELETED" ||
      normalize(fbData?.PAYMENT_METODE) === "REFUND";

    if (firebaseLocked) {
      throw new Error("Refund sudah terkunci realtime");
    }

    // ==================================================
    // 🔥 GLOBAL LOCK
    // ==================================================

    await update(trxRef, {
      refundProcessed: true,

      refundLocked: true,

      deleted: true,

      deletedFromPenjualan: true,

      HIDE_FROM_PENJUALAN: true,

      IS_REFUND: true,

      STATUS: "REFUND_DELETED",

      statusPembayaran: "REFUND",

      PAYMENT_METODE: "REFUND",

      refundedAt: Date.now(),

      refundedBy: userLogin?.username || userLogin?.nama || "SYSTEM",
    });
  }

  // ====================================================
  // SAVE GLOBAL BLACKLIST
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
  // SUCCESS
  // ====================================================

  return {
    success: true,
    trx,
  };
};
