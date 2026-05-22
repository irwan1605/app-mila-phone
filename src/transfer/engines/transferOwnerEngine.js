// src/transfer/engines/transferOwnerEngine.js

import { normalize, normalizeImei, normalizeText } from "../helpers/normalize";

export const buildFinalOwnerTracker = (transaksi = []) => {
  const map = {};

  const sorted = [...transaksi].sort(
    (a, b) =>
      new Date(a.UPDATED_AT || a.CREATED_AT || 0).getTime() -
      new Date(b.UPDATED_AT || b.CREATED_AT || 0).getTime()
  );

  sorted.forEach((t) => {
    const metode = normalize(t.PAYMENT_METODE);

    const status = normalize(t.STATUS);

    // =====================================
    // 🔥 HANYA APPROVED
    // =====================================
    if (!["APPROVED", "REFUND"].includes(status)) {
      return;
    }

    // =====================================
    // 🔥 IMEI / NON IMEI KEY
    // =====================================
    const isNonImei =
      !t?.IMEI ||
      ["-", "--", "NON IMEI"].includes(
        String(t.IMEI || "")
          .trim()
          .toUpperCase()
      );

    // =====================================
    // 🔥 UNIQUE KEY
    // =====================================
    const key = isNonImei
      ? `${normalize(t.NAMA_TOKO || t.tokoPengirim || "-")}|${normalizeText(
          t.NAMA_BRAND || t.brand
        )}|${normalizeText(t.NAMA_BARANG || t.barang)}`
      : normalizeImei(t.IMEI);

    // =====================================
    // 🔥 INIT
    // =====================================
    if (!map[key]) {
      map[key] = {
        qty: 0,
        active: true,
        toko: t.NAMA_TOKO || t.tokoPengirim || "-",
        updatedAt: t.UPDATED_AT || t.CREATED_AT || Date.now(),
      };
    }

    // =====================================
    // 🔥 QTY
    // =====================================
    const qty = Math.abs(Number(t.QTY || t.qty || t.JUMLAH || t.jumlah || 1));

    // =====================================
    // 🔥 STOCK MASUK
    // =====================================
    if (
      ["PEMBELIAN", "REFUND", "TRANSFER_MASUK", "TRANSFER_REJECT"].includes(
        metode
      )
    ) {
      map[key] = {
        ...map[key],

        toko: t.NAMA_TOKO || t.ke || t.tokoTujuan || "-",

        qty: isNonImei ? Number(map[key]?.qty || 0) + qty : 1,

        active: true,

        metode,

        updatedAt: t.UPDATED_AT || t.CREATED_AT || Date.now(),
      };

      return;
    }

    // =====================================
    // 🔥 TRANSFER KELUAR
    // =====================================
    if (metode === "TRANSFER_KELUAR") {
      // =====================================
      // 🔥 SUDAH TERJUAL
      // =====================================
      if (!map[key]?.active) {
        return;
      }

      map[key] = {
        ...map[key],

        toko: t.TOKO_TUJUAN || t.ke || t.tokoTujuan || "-",

        qty: isNonImei ? Math.max(0, Number(map[key]?.qty || 0) - qty) : 1,

        active: isNonImei ? Number(map[key]?.qty || 0) - qty > 0 : true,

        metode,

        asal: t.NAMA_TOKO || "-",

        tujuan: t.TOKO_TUJUAN || t.ke || t.tokoTujuan || "-",

        updatedAt: t.UPDATED_AT || t.CREATED_AT || Date.now(),
      };

      return;
    }

    // =====================================
    // 🔥 PENJUALAN
    // =====================================
    if (["PENJUALAN", "REJECT"].includes(metode)) {
      map[key] = {
        ...map[key],

        qty: isNonImei ? Math.max(0, Number(map[key]?.qty || 0) - qty) : 0,

        active: isNonImei ? Number(map[key]?.qty || 0) - qty > 0 : false,

        toko: t.NAMA_TOKO || "-",

        metode,

        updatedAt: t.UPDATED_AT || t.CREATED_AT || Date.now(),
      };
    }
  });

  return map;
};
