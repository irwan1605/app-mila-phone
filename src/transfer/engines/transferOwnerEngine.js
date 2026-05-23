// src/transfer/engines/transferOwnerEngine.js

import { normalize, normalizeImei, normalizeText } from "../helpers/normalize";

export const buildFinalOwnerTracker = (transaksi = []) => {
  const map = {};

  // =====================================
  // 🔥 SORT TERBARU
  // =====================================
  const sorted = [...transaksi].sort(
    (a, b) =>
      Number(a.UPDATED_AT || a.CREATED_AT || a.createdAt || 0) -
      Number(b.UPDATED_AT || b.CREATED_AT || b.createdAt || 0)
  );

  sorted.forEach((t) => {
    // =====================================
    // 🔥 NORMALIZE
    // =====================================
    const metode = String(t.PAYMENT_METODE || t.paymentMetode || "")
      .trim()
      .toUpperCase();

    const status = String(t.STATUS || t.status || "")
      .trim()
      .toUpperCase();

    // =====================================
    // 🔥 HANYA APPROVED
    // =====================================
    if (!["APPROVED", "APPROVE", "REFUND"].includes(status)) {
      return;
    }

    // =====================================
    // 🔥 NON IMEI DETECTOR
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

        toko: t.NAMA_TOKO || t.ke || t.tokoTujuan || "-",

        metode,

        updatedAt: t.UPDATED_AT || t.CREATED_AT || Date.now(),
      };
    }

    // =====================================
    // 🔥 QTY
    // =====================================
    const qty = Math.abs(Number(t.QTY || t.qty || t.JUMLAH || t.jumlah || 1));

    // =====================================
    // 🔥 STOCK MASUK FINAL
    // =====================================
    if (
      ["PEMBELIAN", "REFUND", "TRANSFER_MASUK", "TRANSFER_REJECT"].includes(
        metode
      )
    ) {
      map[key] = {
        ...map[key],

        // =====================================
        // 🔥 OWNER FINAL
        // =====================================
        toko: t.ke || t.tokoTujuan || t.TOKO_TUJUAN || t.NAMA_TOKO || "-",

        qty: isNonImei ? Number(map[key]?.qty || 0) + qty : 1,

        active: true,

        metode,

        updatedAt: t.UPDATED_AT || t.CREATED_AT || Date.now(),
      };

      console.log("🔥 FINAL OWNER MASUK", {
        imei: t.IMEI,
        toko: map[key]?.toko,
        metode,
      });

      return;
    }

    // =====================================
    // 🔥 TRANSFER KELUAR
    // =====================================
    // JANGAN PINDAH OWNER
    // OWNER PINDAH DI TRANSFER_MASUK
    // =====================================
    if (metode === "TRANSFER_KELUAR") {
      // =====================================
      // 🔥 NON IMEI
      // =====================================
      if (isNonImei) {
        map[key] = {
          ...map[key],

          qty: Math.max(0, Number(map[key]?.qty || 0) - qty),

          active: Number(map[key]?.qty || 0) - qty > 0,

          metode,

          updatedAt: t.UPDATED_AT || t.CREATED_AT || Date.now(),
        };
      }

      console.log("🔥 TRANSFER KELUAR", {
        imei: t.IMEI,
        ownerTetap: map[key]?.toko,
      });

      return;
    }

    // =====================================
    // 🔥 PENJUALAN / REJECT
    // =====================================
    if (["PENJUALAN", "REJECT"].includes(metode)) {
      map[key] = {
        ...map[key],

        qty: isNonImei ? Math.max(0, Number(map[key]?.qty || 0) - qty) : 0,

        active: isNonImei ? Number(map[key]?.qty || 0) - qty > 0 : false,

        toko: t.NAMA_TOKO || map[key]?.toko || "-",

        metode,

        updatedAt: t.UPDATED_AT || t.CREATED_AT || Date.now(),
      };

      console.log("🔥 FINAL SOLD", {
        imei: t.IMEI,
        active: map[key]?.active,
      });
    }
  });

  console.log("🔥 FINAL OWNER TRACKER", map);

  return map;
};
