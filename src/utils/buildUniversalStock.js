// src/utils/buildUniversalStock.js

export const normalizeImei = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/[^0-9]/g, "");

export const normalizeText = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

export const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

export function buildUniversalStock({
  transaksi = [],
  detailStock = {},
  supplierLookup = {},
  filterToko = "semua",
}) {
  const map = {};

  // ======================================
  // 🔥 IMEI TERJUAL
  // ======================================
  const imeiTerjual = new Set();

  transaksi.forEach((t) => {
    if (!t?.IMEI) return;

    const imei = normalizeImei(t.IMEI);

    const metode = String(t.PAYMENT_METODE || "").toUpperCase();

    const status = String(t.STATUS || "").toUpperCase();

    if (!["APPROVED", "REFUND"].includes(status)) return;

    if (metode === "PENJUALAN") {
      imeiTerjual.add(imei);
    }

    if (metode === "REFUND") {
      imeiTerjual.delete(imei);
    }
  });

  // ======================================
  // 🔥 REFUND ACTIVE
  // ======================================
  const refundAvailableSet = new Set();

  transaksi.forEach((t) => {
    const metode = String(t.PAYMENT_METODE || "").toUpperCase();

    const status = String(t.STATUS || "").toUpperCase();

    if (
      metode === "REFUND" &&
      ["APPROVED", "REFUND"].includes(status) &&
      t.IMEI
    ) {
      refundAvailableSet.add(normalizeImei(t.IMEI));
    }
  });

  // ======================================
  // 🔥 PROCESS TRANSAKSI
  // ======================================
  transaksi.forEach((t) => {
    if (!t) return;

    const status = String(t.STATUS || "").toUpperCase();

    if (!["APPROVED", "REFUND"].includes(status)) return;

    const metode = String(t.PAYMENT_METODE || "").toUpperCase();

    const toko = t.NAMA_TOKO || "-";

    // ======================================
    // 🔥 FILTER TOKO
    // ======================================
    if (filterToko !== "semua" && normalize(toko) !== normalize(filterToko)) {
      return;
    }

    // ======================================
    // 🔥 IMEI
    // ======================================
    if (t.IMEI) {
      const cleanImei = normalizeImei(t.IMEI);

      const key = `${normalize(toko)}|${cleanImei}`;

      if (!map[key]) {
        map[key] = {
          key,

          tanggal: t.TANGGAL_TRANSAKSI || "-",

          toko,

          supplier: t.NAMA_SUPPLIER || supplierLookup?.[cleanImei] || "-",

          brand: t.NAMA_BRAND || "-",

          barang: t.NAMA_BARANG || "-",

          imei: t.IMEI,

          qty: 0,

          lastTransaksi: metode,
        };
      }

      // STOCK MASUK
      if (
        [
          "PEMBELIAN",
          "TRANSFER_MASUK",
          "TRANSFER_REJECT",
          "REFUND",
          "RETUR",
          "VOID OPNAME",
        ].includes(metode)
      ) {
        map[key].qty = 1;
      }

      // STOCK KELUAR
      if (["PENJUALAN", "TRANSFER_KELUAR", "STOK OPNAME"].includes(metode)) {
        map[key].qty = 0;
      }

      return;
    }

    // ======================================
    // 🔥 NON IMEI
    // ======================================
    const skuKey =
      `${normalize(toko)}|` +
      `${normalizeText(t.NAMA_BRAND)}|` +
      `${normalizeText(t.NAMA_BARANG)}`;

    if (!map[skuKey]) {
      map[skuKey] = {
        key: skuKey,

        tanggal: t.TANGGAL_TRANSAKSI || "-",

        toko,

        supplier:
          t.NAMA_SUPPLIER ||
          supplierLookup?.[
            `${normalizeText(t.NAMA_BRAND)}|${normalizeText(t.NAMA_BARANG)}`
          ] ||
          "-",

        brand: t.NAMA_BRAND || "-",

        barang: t.NAMA_BARANG || "-",

        imei: "",

        qty: 0,

        lastTransaksi: metode,
      };
    }

    const qty = Number(t.QTY || 0);

    // STOCK MASUK
    if (
      [
        "PEMBELIAN",
        "TRANSFER_MASUK",
        "TRANSFER_REJECT",
        "REFUND",
        "RETUR",
        "VOID OPNAME",
      ].includes(metode)
    ) {
      map[skuKey].qty += Math.abs(qty);
    }

    // STOCK KELUAR
    if (["PENJUALAN", "TRANSFER_KELUAR", "STOK OPNAME"].includes(metode)) {
      map[skuKey].qty -= Math.abs(qty);
    }
  });

  // ======================================
  // 🔥 FALLBACK DETAIL STOCK
  // ======================================
  Object.values(detailStock || {}).forEach((s) => {
    if (!s?.imei) return;

    const cleanImei = normalizeImei(s.imei);

    if (imeiTerjual.has(cleanImei) && !refundAvailableSet.has(cleanImei)) {
      return;
    }

    const key = `${normalize(s.toko)}|${cleanImei}`;

    if (map[key]) return;

    map[key] = {
      key,

      tanggal: s.updatedAt || "-",

      toko: s.toko || "-",

      supplier: supplierLookup?.[s.imei] || supplierLookup?.[cleanImei] || "-",

      brand: s.brand || "-",

      barang: s.namaBarang || "-",

      imei: s.imei,

      qty: 1,

      lastTransaksi: "DETAIL_STOCK",
    };
  });

  // ======================================
  // 🔥 FINAL FILTER
  // ======================================
  return Object.values(map).filter((r) => {
    if (!r.imei) {
      return Number(r.qty || 0) > 0;
    }

    return Number(r.qty || 0) > 0;
  });
}
