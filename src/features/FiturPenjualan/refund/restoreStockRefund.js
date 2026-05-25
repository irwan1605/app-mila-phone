// =====================================================
// features/FiturPenjualan/refund/restoreStockRefund.js
// FINAL FIX 100%
// REFUND + LOCK DOUBLE REFUND
// =====================================================

import { addTransaksi } from "../../../services/FirebaseService";

import { ref, get } from "firebase/database";

import { db } from "../../../firebase/FirebaseInit";

// =====================================================
// NORMALIZE
// =====================================================

const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

// =====================================================
// LOAD ALL TRANSAKSI
// =====================================================

const loadAllTransaksi = async () => {
  try {
    const snap = await get(ref(db, "toko"));

    const rows = [];

    snap.forEach((tokoSnap) => {
      const transaksi = tokoSnap.val()?.transaksi || {};

      Object.values(transaksi).forEach((trx) => {
        rows.push(trx);
      });
    });

    return rows;
  } catch (err) {
    console.error(err);

    return [];
  }
};

// =====================================================
// RESTORE STOCK REFUND
// =====================================================

export const restoreStockRefund = async (trx) => {
  try {
    // =========================================
    // VALIDASI
    // =========================================
    if (!trx) {
      throw new Error("❌ Transaksi refund tidak ditemukan");
    }

    const items = Array.isArray(trx.items) ? trx.items : [];

    // =========================================
    // LOAD ALL TRANSAKSI
    // =========================================
    const allTransaksi = await loadAllTransaksi();

    // =========================================
    // LOOP ITEMS
    // =========================================
    for (const item of items) {
      // =========================================
      // REFUND UNIQUE KEY
      // =========================================
      const refundKey = `${trx.invoice}_${item.namaBarang}_${item.namaBrand}`
        .replace(/\s+/g, "_")
        .toUpperCase();

      // =========================================
      // CEK DOUBLE REFUND
      // =========================================
      const existingRefund = allTransaksi.find((t) => {
        return normalize(t.REFUND_KEY) === normalize(refundKey);
      });

      // =========================================
      // BLOCK DOUBLE REFUND
      // =========================================
      if (existingRefund) {
        console.log("⛔ REFUND SUDAH ADA:", refundKey);

        continue;
      }

      // =========================================
      // IMEI
      // =========================================
      if (item.isImei) {
        const imei = item.imeiList?.[0] || "";

        if (!imei) {
          console.warn("⚠️ IMEI kosong");

          continue;
        }

        await addTransaksi({
          // =====================================
          // STATUS
          // =====================================
          PAYMENT_METODE: "REFUND",

          STATUS: "APPROVED",

          STATUS_TRANSAKSI: "REFUND",

          // =====================================
          // REFUND KEY
          // =====================================
          REFUND_KEY: refundKey,

          // =====================================
          // DATA TOKO
          // =====================================
          NAMA_TOKO: trx.toko || trx.NAMA_TOKO || "",

          toko: trx.toko || trx.NAMA_TOKO || "",

          // =====================================
          // DATA BARANG
          // =====================================
          NAMA_BARANG: item.namaBarang || "",

          NAMA_BRAND: item.namaBrand || "",

          kategoriBarang: item.kategoriBarang || "",

          // =====================================
          // IMEI
          // =====================================
          IMEI: imei,

          imei: imei,

          // =====================================
          // QTY
          // =====================================
          QTY: 1,

          qty: 1,

          // =====================================
          // REF
          // =====================================
          invoice: trx.invoice || "",

          refundInvoice: trx.invoice || "",

          refundAt: Date.now(),

          refundBy: trx.userLogin || "SYSTEM",
        });

        console.log("✅ REFUND IMEI:", imei);
      }

      // =========================================
      // NON IMEI
      // =========================================
      else {
        const qty = Number(item.qty || 0);

        if (qty <= 0) {
          console.warn("⚠️ QTY refund tidak valid");

          continue;
        }

        await addTransaksi({
          // =====================================
          // STATUS
          // =====================================
          PAYMENT_METODE: "REFUND",

          STATUS: "APPROVED",

          STATUS_TRANSAKSI: "REFUND",

          // =====================================
          // REFUND KEY
          // =====================================
          REFUND_KEY: refundKey,

          // =====================================
          // TOKO
          // =====================================
          NAMA_TOKO: trx.toko || trx.NAMA_TOKO || "",

          toko: trx.toko || trx.NAMA_TOKO || "",

          // =====================================
          // BARANG
          // =====================================
          NAMA_BARANG: item.namaBarang || "",

          NAMA_BRAND: item.namaBrand || "",

          kategoriBarang: item.kategoriBarang || "",

          // =====================================
          // QTY
          // =====================================
          QTY: qty,

          qty: qty,

          // =====================================
          // REF
          // =====================================
          invoice: trx.invoice || "",

          refundInvoice: trx.invoice || "",

          refundAt: Date.now(),

          refundBy: trx.userLogin || "SYSTEM",
        });

        console.log("✅ REFUND NON IMEI:", item.namaBarang, qty);
      }
    }

    return true;
  } catch (err) {
    console.error(err);

    throw err;
  }
};
