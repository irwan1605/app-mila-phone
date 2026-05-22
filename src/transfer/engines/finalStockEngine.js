// src/transfer/engines/finalStockEngine.js

import { normalize, normalizeImei, normalizeText } from "../helpers/normalize";

import { buildFinalOwnerTracker } from "./transferOwnerEngine";

export const buildFinalStockRows = ({
  transaksi = [],
  namaToko = "",
  masterBarang = [],
  masterToko = [],
}) => {
  if (!namaToko) return [];

  // ======================================
  // 🔥 OWNER TRACKER IMEI
  // ======================================
  const ownerTracker = buildFinalOwnerTracker(transaksi);

  // ======================================
  // 🔥 MASTER HARGA MAP
  // ======================================
  const hargaMap = {};

  masterBarang.forEach((b) => {
    const key = `${normalizeText(b.brand)}|${normalizeText(b.namaBarang)}`;

    hargaMap[key] = {
      hargaSRP: Number(b.harga?.srp || b.hargaSRP || 0) || 0,

      hargaGrosir: Number(b.harga?.grosir || b.hargaGrosir || 0) || 0,

      hargaReseller: Number(b.harga?.reseller || b.hargaReseller || 0) || 0,
    };
  });

  // ======================================
  // 🔥 MASTER TOKO MAP
  // ======================================
  const tokoMap = {};

  masterToko.forEach((t) => {
    const nama = normalize(t?.nama);

    tokoMap[nama] = t?.nama || "-";
  });

  // ======================================
  // 🔥 GET TOKO FINAL
  // ======================================
  const getNamaToko = (raw) => {
    const clean = normalize(raw);

    return tokoMap[clean] || raw || "-";
  };

  // ======================================
  // 🔥 TRANSFER CHECK
  // ======================================
  const isTransferBarang = (metode) => {
    return ["TRANSFER_MASUK", "TRANSFER_KELUAR"].includes(normalize(metode));
  };

  // ======================================
  // 🔥 GET QTY
  // ======================================
  const getQty = (t) => {
    return Number(t?.QTY || t?.qty || t?.JUMLAH || t?.jumlah || t?.PCS || 0);
  };

  // ======================================
  // 🔥 NON IMEI DETECTOR
  // ======================================
  const isNonImei = (t) => {
    const imeiRaw = String(t?.IMEI || t?.imei || "")
      .trim()
      .toUpperCase();

    return (
      !imeiRaw ||
      imeiRaw === "-" ||
      imeiRaw === "--" ||
      imeiRaw === "NON IMEI" ||
      imeiRaw === "NON-IMEI" ||
      imeiRaw === "NONIMEI"
    );
  };

  // ======================================
  // 🔥 FINAL MAP
  // ======================================
  const map = {};

  // ======================================
  // 🔥 NON IMEI TRACKER
  // ======================================
  const nonImeiTracker = {};

  // ======================================
  // 🔥 FINAL SKU ROWS
  // ======================================
  const finalSkuRows = {};

  // ======================================
  // 🔥 SUPPLIER LOOKUP
  // ======================================
  const supplierLookup = {};

  // ======================================
  // 🔥 GLOBAL SUPPLIER LOOKUP
  // ======================================
  transaksi.forEach((trx) => {
    const supplier = trx.NAMA_SUPPLIER || trx.namaSupplier || "-";

    // ======================================
    // 🔥 IMEI
    // ======================================
    if (trx.IMEI && normalizeImei(trx.IMEI)) {
      const imei = normalizeImei(trx.IMEI);

      supplierLookup[imei] = supplier;
    }

    // ======================================
    // 🔥 NON IMEI
    // ======================================
    const skuKey = `${normalizeText(trx.NAMA_BRAND)}|${normalizeText(
      trx.NAMA_BARANG
    )}`;

    // ======================================
    // 🔥 AMBIL DARI PEMBELIAN
    // ======================================
    if (normalize(trx.PAYMENT_METODE) === "PEMBELIAN") {
      supplierLookup[skuKey] = supplier;
    }
  });

  // ======================================
  // 🔥 PROCESS TRANSAKSI
  // ======================================
  transaksi.forEach((t) => {
    // ======================================
    // 🔥 NORMALIZE TRANSFER NON IMEI
    // ======================================
    const trx = {
      ...t,

      PAYMENT_METODE:
        t.PAYMENT_METODE || (t.noSuratJalan ? "TRANSFER_KELUAR" : ""),

      // ======================================
      // 🔥 FIX TRANSFER TOKO
      // ======================================
      NAMA_TOKO:
        t.noSuratJalan || t.suratJalanId
          ? t.tokoPengirim || "-"
          : t.NAMA_TOKO || "-",

      NAMA_BARANG: t.NAMA_BARANG || t.barang || "-",

      NAMA_BRAND: t.NAMA_BRAND || t.brand || "-",

      QTY: t.QTY || t.qty || 0,

      STATUS: t.STATUS || t.status || "APPROVED",
    };

    // ======================================
    // 🔥 FIX STATUS TRANSFER
    // ======================================
    const status = normalize(t.STATUS || t.status || "APPROVED");

    if (!["APPROVED", "REFUND"].includes(status)) {
      return;
    }

    // ======================================
    // 🔥 FIX METODE TRANSFER
    // ======================================
    const metode = normalize(
      t.PAYMENT_METODE ||
        t.paymentMetode ||
        t.metode ||
        (t.noSuratJalan || t.suratJalanId ? "TRANSFER_KELUAR" : "")
    );

    // ======================================
    // 🔥 IMEI ENGINE
    // ======================================
    if (!isNonImei(t)) {
      const imei = normalizeImei(t.IMEI);

      const owner = ownerTracker[imei];

      // ======================================
      // 🔥 OWNER TIDAK AKTIF
      // ======================================
      if (!owner?.active) {
        delete map[imei];

        return;
      }

      // ======================================
      // 🔥 BUKAN TOKO INI
      // ======================================
      if (normalize(owner?.toko) !== normalize(namaToko)) {
        delete map[imei];

        return;
      }

      // ======================================
      // 🔥 STOCK KELUAR
      // ======================================
      if (["PENJUALAN", "REJECT", "STOK OPNAME"].includes(metode)) {
        delete map[imei];

        return;
      }

      // ======================================
      // 🔥 HARGA
      // ======================================
      const hargaKey = `${normalizeText(t.NAMA_BRAND)}|${normalizeText(
        t.NAMA_BARANG
      )}`;

      const harga = hargaMap[hargaKey] || {};

      // ======================================
      // 🔥 FINAL ROW
      // ======================================
      map[imei] = {
        tanggal: t.TANGGAL_TRANSAKSI || "-",

        noDo: t.NO_INVOICE || "-",

        supplier: supplierLookup[imei] || t.NAMA_SUPPLIER || "-",

        namaToko: getNamaToko(owner?.toko || t.NAMA_TOKO),

        toko: getNamaToko(owner?.toko || t.NAMA_TOKO),

        brand: t.NAMA_BRAND || "-",

        barang: t.NAMA_BARANG || "-",

        imei,

        qty: 1,

        hargaSRP: harga.hargaSRP || 0,

        hargaGrosir: harga.hargaGrosir || 0,

        hargaReseller: harga.hargaReseller || 0,

        statusBarang: "TERSEDIA",

        keterangan: isTransferBarang(metode) ? "TRANSFER BARANG" : metode,
      };

      return;
    }
    // ======================================
    // 🔥 NON IMEI ENGINE FINAL
    // ======================================

    const brand = normalizeText(trx.NAMA_BRAND);

    const barang = normalizeText(trx.NAMA_BARANG);

    const qty = Math.abs(
      Number(t.QTY || t.qty || t.JUMLAH || t.jumlah || t.PCS || 0)
    );

    const tokoAsal = normalize(trx.tokoPengirim || trx.NAMA_TOKO || "-");

    const tokoTujuan = normalize(
      trx.ke || trx.tokoTujuan || trx.TOKO_TUJUAN || trx.NAMA_TOKO_TUJUAN || "-"
    );

    const makeKey = (toko) => `${normalize(toko)}|${brand}|${barang}`;

    const key = makeKey(tokoAsal);

    // ======================================
    // 🔥 INIT TRACKER
    // ======================================
    if (!nonImeiTracker[key] || typeof nonImeiTracker[key] !== "object") {
      nonImeiTracker[key] = {
        qty: 0,
        terakhir: trx,
      };
    }

    // ======================================
    // 🔥 STOCK MASUK
    // ======================================
    if (["PEMBELIAN", "REFUND", "TRANSFER_REJECT"].includes(metode)) {
      nonImeiTracker[key].qty += qty;

      nonImeiTracker[key].terakhir = trx;
    }

    // ======================================
    // 🔥 STOCK KELUAR
    // ======================================
    if (["PENJUALAN", "REJECT", "STOK OPNAME"].includes(metode)) {
      nonImeiTracker[key].qty -= qty;

      nonImeiTracker[key].terakhir = trx;
    }

    // ======================================
    // 🔥 TRANSFER NON IMEI
    // ======================================
    if (metode === "TRANSFER_KELUAR" && tokoTujuan && tokoTujuan !== "-") {
      const asalKey = makeKey(tokoAsal);

      const tujuanKey = makeKey(tokoTujuan);

      // ======================================
      // 🔥 INIT TUJUAN
      // ======================================
      if (!nonImeiTracker[tujuanKey]) {
        nonImeiTracker[tujuanKey] = {
          qty: 0,
          terakhir: trx,
        };
      }

      // ======================================
      // 🔥 PINDAH STOCK
      // ======================================
      nonImeiTracker[asalKey].qty -= qty;

      nonImeiTracker[tujuanKey].qty += qty;

      // ======================================
      // 🔥 ANTI MINUS
      // ======================================
      if (nonImeiTracker[asalKey].qty < 0) {
        nonImeiTracker[asalKey].qty = 0;
      }

      // ======================================
      // 🔥 UPDATE LAST TRX
      // ======================================
      nonImeiTracker[asalKey].terakhir = {
        ...trx,
        PAYMENT_METODE: "TRANSFER_KELUAR",
        NAMA_TOKO: tokoAsal,
      };

      nonImeiTracker[tujuanKey].terakhir = {
        ...trx,
        PAYMENT_METODE: "TRANSFER_MASUK",
        NAMA_TOKO: tokoTujuan,
      };

      return;
    }
  });

  // ======================================
  // 🔥 BUILD FINAL NON IMEI STOCK
  // ======================================

  Object.entries(nonImeiTracker).forEach(([key, val]) => {
    const finalQty = Number(val?.qty || 0);

    // ======================================
    // 🔥 HAPUS STOCK HABIS TOTAL
    // ======================================
    if (finalQty <= 0) {
      delete nonImeiTracker[key];

      delete finalSkuRows[key];

      delete map[key];

      return;
    }

    const trx = val?.terakhir || {};

    const [toko, brand, barang] = key.split("|");

    const hargaKey = `${brand}|${barang}`;

    const harga = hargaMap[hargaKey] || {};

    // ======================================
    // 🔥 FIX SUPPLIER
    // ======================================
    const supplier =
      supplierLookup[`${brand}|${barang}`] || trx.NAMA_SUPPLIER || "-";

    finalSkuRows[key] = {
      tanggal: trx.TANGGAL_TRANSAKSI || "-",

      noDo: trx.NO_INVOICE || "-",

      supplier,

      namaToko: getNamaToko(toko),

      toko: getNamaToko(toko),

      brand,

      barang,

      imei: "NON IMEI",

      qty: finalQty,

      hargaSRP: harga.hargaSRP || 0,

      hargaGrosir: harga.hargaGrosir || 0,

      hargaReseller: harga.hargaReseller || 0,

      statusBarang: "TERSEDIA",

      keterangan:
        normalize(trx.PAYMENT_METODE) === "REFUND"
          ? "REFUND"
          : normalize(trx.PAYMENT_METODE) === "TRANSFER_MASUK"
          ? "TRANSFER BARANG"
          : "PEMBELIAN",
    };

    // ======================================
    // 🔥 HANYA MASUKKAN STOCK AKTIF
    // ======================================
    if (normalize(toko) === normalize(namaToko) && finalQty > 0) {
      map[key] = finalSkuRows[key];
    } else {
      delete map[key];
    }
  });

  // ======================================
  // 🔥 FINAL FILTER
  // ======================================
  return Object.values(map)
    .filter((x) => {
      // ======================================
      // 🔥 QTY HARUS ADA
      // ======================================
      if (Number(x.qty || 0) < 0) {
        return false;
      }

      // ======================================
      // 🔥 TOKO HARUS ADA
      // ======================================
      if (!x.namaToko || x.namaToko === "-") {
        return false;
      }

      // ======================================
      // 🔥 HAPUS DATA TIDAK AKTIF
      // ======================================
      if (normalize(x.statusBarang) === "TIDAK AKTIF") {
        return false;
      }

      // ======================================
      // 🔥 HAPUS TRANSFER_MASUK LIAR
      // ======================================
      // ======================================
      // 🔥 HANYA HAPUS DATA INVALID
      // ======================================
      if (
        normalize(x.keterangan) === "TRANSFER_MASUK" &&
        Number(x.qty || 0) <= 0
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => String(a.brand || "").localeCompare(String(b.brand || "")));
};
