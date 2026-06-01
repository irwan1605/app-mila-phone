// src/features/dashboard/utils/buildCardPersediaanBarang.js

import { buildInventoryReportRows } from "./utils/buildInventoryReportRows";

export const buildCardPersediaanBarang = ({
  transaksi = [],
  detailStock = {},
  namaToko = "",
  masterMap = {},
  supplierLookup = {},
}) => {
  // ======================================
  // STOCK FINAL SESUAI INVENTORY REPORT
  // ======================================
  const finalRows = buildInventoryReportRows({
    transaksi,
    detailStock,
    namaToko,
    masterMap,
    supplierLookup,
  });

  console.log(
    "🔥 SEMUA MARKETPLACE",
    finalRows.filter(
      (x) =>
        String(x.namaToko || "")
          .trim()
          .toUpperCase() === "MARKETPLACE"
    )
  );

  // ======================================
  // HILANGKAN DATA LIAR
  // ======================================
  const validRows = finalRows.filter((row) => {
    const qty = Number(row.qty || 0);

    if (qty <= 0) return false;

    if (
      String(row.statusBarang || "")
        .trim()
        .toUpperCase() !== "TERSEDIA"
    ) {
      return false;
    }

    return true;
  });

  const cleanRows = validRows.filter((row) => {
    const ket = String(
      row.keterangan || row.status || row.metode || ""
    ).toUpperCase();

    if (
      ket.includes("PENJUALAN") ||
      ket.includes("TRANSFER_KELUAR") ||
      ket.includes("REJECT") ||
      ket.includes("STOK OPNAME")
    ) {
      return false;
    }

    return true;
  });

  // ======================================
  // GROUPING PER BARANG
  // ======================================
  const map = {};

  const tokoAktif = String(namaToko || "")
    .trim()
    .toUpperCase();

  cleanRows
    .filter((row) => {
      return (
        String(row.namaToko || "")
          .trim()
          .toUpperCase() === tokoAktif
      );
    })
    .forEach((row) => {
      const key = `${row.namaToko}|${row.brand}|${row.barang}`
        .trim()
        .toUpperCase();

      if (!map[key]) {
        map[key] = {
          namaToko: row.namaToko,
          brand: row.brand,
          barang: row.barang,
          qty: 0,
        };
      }

      if (Number(row.qty || 0) <= 0) {
        return;
      }

      map[key].qty += Number(row.qty || 0);
    });

  Object.keys(map).forEach((key) => {
    const item = map[key];

    if (Number(item.qty || 0) <= 0) {
      delete map[key];
    }
  });

  Object.keys(map).forEach((key) => {
    const item = map[key];

    if (!item) return;

    if (Number(item.qty || 0) <= 0) {
      delete map[key];
      return;
    }

    if (!item.barang) {
      delete map[key];
    }
  });

    // ======================================
  // FILTER FINAL
  // ======================================
  const finalItems = Object.values(map)
    .filter((item) => Number(item.qty || 0) > 0)
    .filter((item) => {
      const stockKey =
        `${String(item.namaToko || "").trim().toUpperCase()}|` +
        `${String(item.brand || "").trim().toUpperCase()}|` +
        `${String(item.barang || "").trim().toUpperCase()}`;

      const stockReal =
        Number(detailStock?.[stockKey]?.qty || 0);

      // HILANGKAN GHOST STOCK
      if (stockReal <= 0) {
        console.log(
          "❌ GHOST STOCK REMOVED",
          stockKey,
          item.qty
        );
        return false;
      }

      return true;
    });

    return finalItems.sort(
      (a, b) => Number(b.qty || 0) - Number(a.qty || 0)
    );
};
