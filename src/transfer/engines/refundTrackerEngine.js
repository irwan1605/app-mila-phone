// src/transfer/engines/refundTrackerEngine.js

import { normalize, normalizeImei } from "../helpers/normalize";

export const buildRefundTracker = (transaksi = []) => {
  const map = {};

  // =====================================
  // 🔥 SORT REALTIME
  // =====================================
  const sorted = [...transaksi].sort(
    (a, b) => Number(a.CREATED_AT || 0) - Number(b.CREATED_AT || 0)
  );

  sorted.forEach((t) => {
    // =====================================
    // 🔥 WAJIB IMEI
    // =====================================
    if (!t?.IMEI) return;

    const imei = normalizeImei(t.IMEI);

    if (!imei) return;

    // =====================================
    // 🔥 NORMALIZE
    // =====================================
    const metode = normalize(t.PAYMENT_METODE);

    const status = normalize(t.STATUS);

    // =====================================
    // 🔥 HANYA DATA AKTIF
    // =====================================
    if (!["approved", "refund"].includes(status)) {
      return;
    }

    // =====================================
    // 🔥 REFUND AKTIF
    // =====================================
    if (metode === "refund") {
      map[imei] = {
        active: true,

        metode: "REFUND",

        toko: t.NAMA_TOKO || "-",

        tanggal: t.TANGGAL_TRANSAKSI || "-",

        transaksi: t,
      };

      return;
    }

    // =====================================
    // 🔥 TRANSFER REFUND
    // =====================================
    if (metode === "transfer_keluar" && t.IS_REFUND_TRANSFER) {
      map[imei] = {
        active: true,

        metode: "TRANSFER_REFUND",

        toko: t.TOKO_TUJUAN || t.tokoTujuan || "-",

        tanggal: t.TANGGAL_TRANSAKSI || "-",

        transaksi: t,
      };

      return;
    }

    // =====================================
    // 🔥 TERJUAL LAGI
    // =====================================
    if (metode === "penjualan") {
      map[imei] = {
        active: false,

        metode: "PENJUALAN",

        toko: t.NAMA_TOKO || "-",

        tanggal: t.TANGGAL_TRANSAKSI || "-",

        transaksi: t,
      };

      return;
    }

    // =====================================
    // 🔥 REJECT
    // =====================================
    if (metode === "reject") {
      map[imei] = {
        active: false,

        metode: "REJECT",

        toko: t.NAMA_TOKO || "-",

        tanggal: t.TANGGAL_TRANSAKSI || "-",

        transaksi: t,
      };

      return;
    }

    // =====================================
    // 🔥 STOK OPNAME
    // =====================================
    if (metode === "stok opname") {
      map[imei] = {
        active: false,

        metode: "STOK OPNAME",

        toko: t.NAMA_TOKO || "-",

        tanggal: t.TANGGAL_TRANSAKSI || "-",

        transaksi: t,
      };
    }
  });

  return map;
};
