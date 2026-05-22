// src/transfer/services/inventoryTrackerService.js

import { normalize, normalizeImei } from "../helpers/normalize";

export const buildInventoryTracker = (transaksi = []) => {
  const map = {};

  const sorted = [...transaksi].sort(
    (a, b) =>
      new Date(a.CREATED_AT || 0).getTime() -
      new Date(b.CREATED_AT || 0).getTime()
  );

  sorted.forEach((t) => {
    if (!t?.IMEI) return;

    const imei = normalizeImei(t.IMEI);

    const metode = normalize(t.PAYMENT_METODE);

    const status = normalize(t.STATUS);

    if (!["APPROVED", "REFUND"].includes(status)) {
      return;
    }

    if (!map[imei]) {
      map[imei] = {
        imei,
        status: "AVAILABLE",
        toko: t.NAMA_TOKO || "-",
      };
    }

    // =====================================
    // PEMBELIAN
    // =====================================
    if (metode === "PEMBELIAN") {
      map[imei].status = "AVAILABLE";
      map[imei].toko = t.NAMA_TOKO || "-";
    }

    // =====================================
    // REFUND
    // =====================================
    if (metode === "REFUND") {
      map[imei].status = "AVAILABLE";
      map[imei].toko = t.NAMA_TOKO || "-";
      map[imei].lastAction = "REFUND";
    }

    // =====================================
    // TRANSFER KELUAR
    // =====================================
    if (metode === "TRANSFER_KELUAR") {
      if (map[imei].status !== "SOLD") {
        map[imei].status = "OUT";
      }
    }

    // =====================================
    // TRANSFER MASUK
    // =====================================
    if (metode === "TRANSFER_MASUK") {
      if (map[imei].status !== "SOLD") {
        map[imei].status = "AVAILABLE";
        map[imei].toko = t.NAMA_TOKO || "-";
      }
    }

    // =====================================
    // PENJUALAN
    // =====================================
    if (metode === "PENJUALAN") {
      map[imei].status = "SOLD";
    }
  });

  return Object.values(map);
};
