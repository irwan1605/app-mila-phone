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
  // ======================================
  // 🔥 GLOBAL SUPPLIER LOOKUP
  // ======================================
  const imeiSupplierLookup = {};

  transaksi.forEach((trx) => {
    const supplier =
      trx.NAMA_SUPPLIER ||
      trx.namaSupplier ||
      trx.supplier ||
      trx.SUPPLIER ||
      trx.nama_supplier ||
      "-";

    // ======================================
    // 🔥 IMEI FINAL
    // ======================================
    const rawImei = trx.IMEI || trx.imei || "";

    const cleanImei = normalizeImei(rawImei);

    const isNonImeiRow =
      !cleanImei ||
      cleanImei === "-" ||
      cleanImei === "--" ||
      cleanImei === "NONIMEI" ||
      cleanImei === "NON IMEI" ||
      cleanImei === "NON-IMEI";

    if (!isNonImeiRow) {
      // ======================================
      // 🔥 SIMPAN SUPPLIER PERTAMA YANG VALID
      // ======================================
      if (
        supplier &&
        supplier !== "-" &&
        supplier !== "" &&
        !imeiSupplierLookup[cleanImei]
      ) {
        imeiSupplierLookup[cleanImei] = supplier;
      }

      // ======================================
      // 🔥 FALLBACK GLOBAL
      // ======================================
      if (supplier && supplier !== "-") {
        supplierLookup[cleanImei] = supplier;
      }
    }

    // ======================================
    // 🔥 NON IMEI
    // ======================================
    const skuKey =
      `${normalizeText(trx.NAMA_BRAND || trx.brand)}|` +
      `${normalizeText(trx.NAMA_BARANG || trx.barang)}`;

    // ======================================
    // 🔥 PEMBELIAN
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
    // ======================================
    // 🔥 FINAL STATUS NORMALIZER
    // ======================================
    const status = String(t.STATUS || t.status || "Approved")
      .trim()
      .toUpperCase();

    // ======================================
    // 🔥 DEBUG STATUS
    // ======================================
    console.log("🔥 FINAL STATUS CHECK", {
      imei: t.IMEI,
      rawStatus: t.STATUS,
      finalStatus: status,
      metode: t.PAYMENT_METODE,
    });

    // ======================================
    // 🔥 FINAL STATUS VALIDATOR
    // ======================================
    if (!["APPROVED", "APPROVE", "REFUND"].includes(status)) {
      console.log("❌ STATUS DITOLAK", {
        imei: t.IMEI,
        status,
      });

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

      console.log("🔥 IMEI LOLOS MASUK ENGINE", {
        imei: t.IMEI,
        metode: t.PAYMENT_METODE,
        status: t.STATUS,
        toko: t.NAMA_TOKO,
      });

      // ======================================
      // 🔥 FINAL OWNER FALLBACK
      // ======================================
      const owner = ownerTracker[imei] || {
        toko: t.ke || t.tokoTujuan || t.TOKO_TUJUAN || t.NAMA_TOKO || "-",

        active: true,

        metode,
      };

      // ======================================
      // 🔥 FINAL OWNER TOKO
      // ======================================
      const finalOwner =
        owner?.toko ||
        t.ke ||
        t.tokoTujuan ||
        t.TOKO_TUJUAN ||
        t.NAMA_TOKO ||
        "-";

      // ======================================
      // 🔥 NORMALIZE OWNER
      // ======================================
      const ownerNormalized = normalize(
        String(finalOwner || "")
          .replace(/_/g, " ")
          .trim()
      );

      const tokoNormalized = normalize(
        String(namaToko || "")
          .replace(/_/g, " ")
          .trim()
      );

      // ======================================
      // 🔥 DEBUG FINAL OWNER
      // ======================================
      console.log("🔥 FINAL OWNER CHECK", {
        imei,
        finalOwner,
        namaToko,
        ownerNormalized,
        tokoNormalized,
        metode,
        owner,
        transaksi: t,
      });

      // ======================================
      // 🔥 OWNER FINAL VALIDATION
      // ======================================
      if (owner?.active === false) {
        return;
      }

      // ======================================
      // 🔥 BUKAN TOKO INI
      // ======================================
      if (
        ownerNormalized &&
        tokoNormalized &&
        ownerNormalized !== tokoNormalized
      ) {
        return;
      }

      // ======================================
      // 🔥 FINAL STOCK KELUAR ENGINE
      // ======================================
      // HANYA HAPUS JIKA OWNER MASIH AKTIF
      // DAN BELUM ADA TRANSFER / REFUND BARU
      // ======================================
      if (["PENJUALAN", "REJECT", "STOK OPNAME"].includes(metode)) {
        const currentTime =
          t.UPDATED_AT || t.updatedAt || t.CREATED_AT || t.createdAt || 0;

        const existingTime = map[imei]?.updatedAt || map[imei]?.UPDATED_AT || 0;

        // ======================================
        // 🔥 JANGAN HAPUS DATA TERBARU
        // ======================================
        if (currentTime >= existingTime) {
          delete map[imei];
        }

        return;
      }

      // ======================================
      // 🔥 HARGA
      // ======================================
      const hargaKey = `${normalizeText(t.NAMA_BRAND)}|${normalizeText(
        t.NAMA_BARANG
      )}`;

      const harga = hargaMap[hargaKey] || {};

      console.log("🔥 FINAL IMEI SUPPLIER", {
        imei,
        supplierLookup: supplierLookup?.[normalizeImei(imei)],
        imeiSupplierLookup: imeiSupplierLookup?.[normalizeImei(imei)],
        transaksiSupplier: t.NAMA_SUPPLIER,
      });

      // ======================================
      // 🔥 FINAL ROW
      // ======================================
      map[imei] = {
        tanggal: t.TANGGAL_TRANSAKSI || "-",

        noDo: t.NO_INVOICE || "-",

        // ======================================
        // 🔥 FIX SUPPLIER IMEI
        // ======================================
        supplier:
          imeiSupplierLookup?.[normalizeImei(imei)] ||
          supplierLookup?.[normalizeImei(imei)] ||
          supplierLookup?.[imei] ||
          t.NAMA_SUPPLIER ||
          t.namaSupplier ||
          t.supplier ||
          t.SUPPLIER ||
          "-",

        namaToko: getNamaToko(finalOwner),

        toko: getNamaToko(finalOwner),

        brand: t.NAMA_BRAND || "-",

        barang: t.NAMA_BARANG || "-",

        imei,

        qty: 1,

        // ======================================
        // 🔥 TRACK UPDATE TIME
        // ======================================
        updatedAt:
          t.UPDATED_AT ||
          t.updatedAt ||
          t.CREATED_AT ||
          t.createdAt ||
          Date.now(),

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

  console.log("🔥 FINAL MAP RESULT", map);

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
