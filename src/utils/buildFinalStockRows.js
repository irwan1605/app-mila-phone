// src/utils/buildFinalStockRows.js

import { buildFinalNonImeiStock } from "./FungsiTransferBarang/buildFinalNonImeiStock";
import { RemoveSoldItemsInsideInvoice } from "./RemoveSoldItemsInsideInvoice";
import { buildFinalTransferOwner } from "./FungsiTransferBarang/buildFinalTransferOwner";

export const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

export const normalizeImei = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

export const normalizeText = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

export const buildFinalStockRows = ({
  transaksi = [],
  detailStock = {},
  namaToko = "",
  masterMap = {},
  supplierLookup = {},
}) => {
  if (!namaToko) return [];

  const map = {};

  const transferOwnerMap = buildFinalTransferOwner(transaksi);

  // ======================================
  // 🔥 FINAL OWNER TRACKER
  // ======================================

  const finalImeiOwner = {};
  // ======================================================
  // FINAL OWNER HISTORY
  // SATU IMEI = SATU OWNER TERAKHIR
  // ======================================================

  const finalOwnerTracker = {};

  const sorted = [...transaksi].sort(
    (a, b) =>
      new Date(a.CREATED_AT || 0).getTime() -
      new Date(b.CREATED_AT || 0).getTime()
  );

  sorted.forEach((trx) => {
    if (!trx?.IMEI) return;

    const status = String(trx.STATUS || "").toUpperCase();

    if (!["APPROVED", "REFUND"].includes(status)) return;

    const metode = String(trx.PAYMENT_METODE || "").toUpperCase();

    const imei = normalizeImei(trx.IMEI);

    const asal = normalize(
      trx.OWNER_SEBELUM || trx.dari || trx.tokoPengirim || trx.NAMA_TOKO
    );

    const tujuan = normalize(
      trx.OWNER_AKHIR ||
        trx.ke ||
        trx.TOKO_TUJUAN ||
        trx.tokoTujuan ||
        trx.tokoPenerima ||
        trx.NAMA_TOKO
    );

    switch (metode) {
      case "PEMBELIAN":
      case "REFUND":
      case "TRANSFER_REJECT":
      case "VOID OPNAME":
        finalOwnerTracker[imei] = {
          toko: tujuan,
          active: true,
          metode,
        };

        break;

      case "TRANSFER_KELUAR":
        finalOwnerTracker[imei] = {
          toko: tujuan,
          active: true,
          metode,
          asal,
          tujuan,
        };

        break;

      case "TRANSFER_MASUK":
        finalOwnerTracker[imei] = {
          toko: tujuan,
          active: true,
          metode,
          asal,
          tujuan,
        };

        break;

      case "PENJUALAN":
      case "REJECT":
      case "STOK OPNAME":
        finalOwnerTracker[imei] = {
          toko: tujuan,
          active: false,
          metode,
        };

        break;

      default:
        break;
    }
  });

  // ======================================
  // 🔥 PROCESS ALL EVENTS
  // ======================================
  sorted.forEach((t) => {
    const status = String(t.STATUS || "").toUpperCase();

    if (!["APPROVED", "REFUND"].includes(status)) {
      return;
    }

    const metode = String(t.PAYMENT_METODE || "").toUpperCase();

    // ======================================
    // 🔥 IMEI
    // ======================================
    const cleanImei = normalizeImei(t.IMEI);

    const isNonImei =
      !cleanImei || cleanImei === "NONIMEI" || cleanImei === "NON-IMEI";

    // ======================================
    // 🔥 IMEI
    // ======================================
    if (!isNonImei) {
      const imei = normalizeImei(t.IMEI);

      // ======================================================
      // PRIORITAS ABSOLUT
      // TRANSFER MASUK SELALU MENJADI STOK TOKO TUJUAN
      // ======================================================

      const ownerToko = normalize(
        t.OWNER_AKHIR ||
          t.ke ||
          t.TOKO_TUJUAN ||
          t.tokoTujuan ||
          t.tokoPenerima ||
          t.NAMA_TOKO
      );

      if (
        metode === "TRANSFER_MASUK" &&
        status === "APPROVED" &&
        ownerToko === normalize(namaToko)
      ) {
        map[imei] = {
          tanggal: t.TANGGAL_TRANSAKSI || "-",

          noDo: t.NO_SURAT_JALAN || t.NO_INVOICE || "-",

          supplier:
            t.NAMA_SUPPLIER || supplierLookup?.[imei] || "ONLINE NON PKP",

          namaToko: ownerToko,

          brand: t.NAMA_BRAND,

          barang: t.NAMA_BARANG,

          imei,

          qty: 1,

          hargaSRP:
            masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaSRP || 0,

          hargaGrosir:
            masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaGrosir || 0,

          hargaReseller:
            masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaReseller || 0,

          statusBarang: "TERSEDIA",

          sumberStock: "TRANSFER",

          keterangan: "TRANSFER BARANG",

          __FORCE_TRANSFER__: true,
        };

        // JANGAN RETURN
      }
      // ======================================
      // 🔥 FINAL OWNER
      // ======================================
      let owner = finalOwnerTracker?.[imei];

      if (!owner && metode === "TRANSFER_MASUK") {
        owner = {
          toko:
            t.ke ||
            t.TOKO_TUJUAN ||
            t.tokoTujuan ||
            t.tokoPenerima ||
            t.NAMA_TOKO,
          active: true,
          metode: "TRANSFER_MASUK",
        };
      }

      // ======================================
      // 🔥 FALLBACK TRANSFER MASUK
      // ======================================
      const currentToko = ownerToko;

      // ======================================
      // 🔥 JIKA TRANSFER MASUK
      // MAKA OWNER HARUS TOKO PENERIMA
      // ======================================
      if (metode === "TRANSFER_MASUK") {
        owner.toko = currentToko;
        owner.active = true;
      }

      // ======================================
      // 🔥 BUKAN OWNER FINAL
      // ======================================
      // ======================================
      // 🔥 VALIDASI OWNER FINAL
      // ======================================
      const finalOwnerToko = normalize(
        owner?.toko ||
          ownerToko ||
          currentToko ||
          t.OWNER_AKHIR ||
          t.ke ||
          t.TOKO_TUJUAN ||
          t.tokoTujuan ||
          t.tokoPenerima ||
          t.NAMA_TOKO
      );

      // ======================================
      // JIKA OWNER BELUM ADA
      // ======================================
      if (!owner) {
        owner = {
          toko: finalOwnerToko,
          active: true,
        };
      }

      // ======================================
      // VALIDASI OWNER
      // ======================================
      if (!owner) {
        owner = {
          toko: t.NAMA_TOKO,
          active: true,
        };
      }

      // ======================================
      // 🔥 TRANSFER KELUAR TETAP AKTIF
      // ======================================

      if (owner?.metode === "TRANSFER_KELUAR") {
        owner.active = true;
      }

      if (!owner.active) {
        delete map[imei];
        return;
      }

      if (
        metode !== "TRANSFER_MASUK" &&
        normalize(owner.toko) !== normalize(namaToko)
      ) {
        delete map[imei];
        return;
      }

      // ======================================
      // 🔥 STOCK KELUAR
      // ======================================
      // ======================================
      // 🔥 TRANSFER JANGAN HAPUS
      // ======================================
      if (["PENJUALAN", "REJECT", "STOK OPNAME"].includes(metode)) {
        delete map[imei];
        return;
      }

      // ======================================
      // 🔥 DETECT TRANSFER REFUND
      // ======================================
      const isTransferRefund =
        metode === "TRANSFER_MASUK" &&
        (String(t.SUMBER_STOCK || "").toUpperCase() === "REFUND" ||
          String(t.LAST_ACTION || "").toUpperCase() === "REFUND" ||
          String(t.IS_REFUND_TRANSFER || "").toUpperCase() === "TRUE");

      // ======================================
      // FINAL OWNER ENTERPRISE
      // HANYA OWNER TERAKHIR YANG BOLEH MUNCUL
      // ======================================

      const latestOwner = transferOwnerMap[imei];

      if (!latestOwner) {
        delete map[imei];
        return;
      }

      if (!latestOwner.active) {
        delete map[imei];
        return;
      }

      // ======================================================
      // HANYA OWNER TERAKHIR YANG BOLEH TAMPIL
      // ======================================================

      if (normalize(latestOwner.toko) !== normalize(namaToko)) {
        delete map[imei];

        return;
      }

      owner = latestOwner;

      // paksa selalu mengikuti owner terakhir
      owner.toko = latestOwner.toko;

      map[imei] = {
        tanggal: t.TANGGAL_TRANSAKSI || "-",

        noDo: t.NO_INVOICE || "-",

        supplier: supplierLookup?.[imei] || t.NAMA_SUPPLIER || "-",

        namaToko: owner?.toko || ownerToko || "-",

        ownerFinal: ownerToko,

        brand: t.NAMA_BRAND || "-",

        barang: t.NAMA_BARANG || "-",

        imei: t.IMEI,

        qty: 1,

        hargaSRP:
          masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaSRP || 0,

        hargaGrosir:
          masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaGrosir || 0,

        hargaReseller:
          masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaReseller || 0,

        statusBarang: "TERSEDIA",

        // ======================================
        // 🔥 KETERANGAN FINAL
        // ======================================
        keterangan: isTransferRefund
          ? "TRANSFER REFUND"
          : metode === "TRANSFER_MASUK"
          ? "TRANSFER BARANG"
          : metode,

        sumberStock: isTransferRefund ? "REFUND" : "NORMAL",
      };

      return;
    }

    // ======================================
    // 🔥 NON IMEI
    // ======================================
    // ======================================
    // 🔥 FINAL OWNER NON IMEI
    // ======================================
    const ownerToko = normalize(
      t.OWNER_AKHIR ||
        t.ke ||
        t.TOKO_TUJUAN ||
        t.tokoTujuan ||
        t.tokoPenerima ||
        t.NAMA_TOKO
    );

    const skuKey =
      `${ownerToko}|` +
      `${normalizeText(t.NAMA_BRAND)}|` +
      `${normalizeText(t.NAMA_BARANG)}`;

    if (!map[skuKey]) {
      map[skuKey] = {
        tanggal: t.TANGGAL_TRANSAKSI || "-",

        noDo: t.NO_SURAT_JALAN || t.NO_INVOICE || "-",

        supplier:
          supplierLookup?.[skuKey] ||
          t.NAMA_SUPPLIER ||
          t.SUPPLIER ||
          t.namaSupplier ||
          // ======================================
          // 🔥 FALLBACK TRANSFER
          // ======================================
          supplierLookup?.[
            `${normalizeText(t.NAMA_BRAND)}|${normalizeText(t.NAMA_BARANG)}`
          ] ||
          "-",

        namaToko: ownerToko,

        brand: t.NAMA_BRAND || "-",

        barang: t.NAMA_BARANG || "-",

        imei: "",

        qty: 0,

        hargaSRP:
          masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaSRP || 0,

        hargaGrosir:
          masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaGrosir || 0,

        hargaReseller:
          masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaReseller || 0,

        statusBarang: "TERSEDIA",

        keterangan: metode === "TRANSFER_MASUK" ? "TRANSFER BARANG" : metode,
      };
    }

    // ======================================
    // 🔥 UPDATE SUPPLIER TRANSFER
    // ======================================
    const latestSupplier =
      // ======================================
      // 🔥 PRIORITAS TRANSAKSI
      // ======================================
      t.NAMA_SUPPLIER ||
      t.SUPPLIER ||
      t.namaSupplier ||
      // ======================================
      // 🔥 EXACT TOKO KEY
      // ======================================
      supplierLookup?.[skuKey] ||
      // ======================================
      // 🔥 GLOBAL BRAND BARANG
      // ======================================
      supplierLookup?.[
        `${normalizeText(t.NAMA_BRAND)}|${normalizeText(t.NAMA_BARANG)}`
      ] ||
      // ======================================
      // 🔥 HISTORI PEMBELIAN
      // ======================================
      transaksi.find((trx) => {
        const metode = String(trx.PAYMENT_METODE || "").toUpperCase();

        return (
          metode === "PEMBELIAN" &&
          normalizeText(trx.NAMA_BRAND) === normalizeText(t.NAMA_BRAND) &&
          normalizeText(trx.NAMA_BARANG) === normalizeText(t.NAMA_BARANG) &&
          (trx.NAMA_SUPPLIER || trx.SUPPLIER || trx.namaSupplier)
        );
      })?.NAMA_SUPPLIER ||
      transaksi.find((trx) => {
        const metode = String(trx.PAYMENT_METODE || "").toUpperCase();

        return (
          metode === "PEMBELIAN" &&
          normalizeText(trx.NAMA_BRAND) === normalizeText(t.NAMA_BRAND) &&
          normalizeText(trx.NAMA_BARANG) === normalizeText(t.NAMA_BARANG)
        );
      })?.SUPPLIER ||
      "ONLINE NON PKP";

    // ======================================
    // 🔥 JIKA ADA SUPPLIER BARU
    // ======================================
    if (
      latestSupplier &&
      latestSupplier !== "-" &&
      latestSupplier !== "undefined"
    ) {
      map[skuKey].supplier = latestSupplier;
    }

    // ======================================
    // 🔥 STOCK MASUK
    // ======================================
    if (
      [
        "PEMBELIAN",
        "TRANSFER_MASUK",
        "TRANSFER_REJECT",
        "REFUND",
        "VOID OPNAME",
      ].includes(metode)
    ) {
      map[skuKey].qty += Math.abs(Number(t.QTY || 0));
    }

    // ======================================
    // 🔥 ENGINE PINDAH OWNER NON IMEI
    // TRANSFER BOLEH BERKALI-KALI
    // ======================================
    // ======================================
    // 🔥 ENGINE PINDAH OWNER NON IMEI
    // ======================================
    if (metode === "TRANSFER_KELUAR") {
      const tujuan = normalize(
        t.OWNER_AKHIR || t.ke || t.TOKO_TUJUAN || t.tokoTujuan || t.tokoPenerima
      );

      const oldKey =
        `${normalize(
          t.OWNER_SEBELUM || t.tokoPengirim || t.dari || t.NAMA_TOKO
        )}|` +
        `${normalizeText(t.NAMA_BRAND)}|` +
        `${normalizeText(t.NAMA_BARANG)}`;

      const newKey =
        `${tujuan}|` +
        `${normalizeText(t.NAMA_BRAND)}|` +
        `${normalizeText(t.NAMA_BARANG)}`;

      const qty = Math.abs(Number(t.QTY || 0));

      if (!map[oldKey]) {
        map[oldKey] = {
          tanggal: t.TANGGAL_TRANSAKSI || "-",

          noDo: t.NO_SURAT_JALAN || t.NO_INVOICE || "-",

          supplier:
            t.NAMA_SUPPLIER || supplierLookup?.[newKey] || "ONLINE NON PKP",

          namaToko: normalize(
            t.OWNER_SEBELUM || t.tokoPengirim || t.dari || t.NAMA_TOKO
          ),

          brand: t.NAMA_BRAND || "-",

          barang: t.NAMA_BARANG || "-",

          imei: "",

          qty: 0,

          hargaSRP:
            masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaSRP || 0,

          hargaGrosir:
            masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaGrosir || 0,

          hargaReseller:
            masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaReseller || 0,

          statusBarang: "TERSEDIA",

          keterangan: "TRANSFER BARANG",
        };
      }

      map[oldKey].qty = Math.max(0, Number(map[oldKey].qty || 0) - qty);

      if (map[oldKey].qty === 0) {
        delete map[oldKey];
      }

      if (!map[newKey]) {
        map[newKey] = {
          ...(map[oldKey] || {}),

          tanggal: t.TANGGAL_TRANSAKSI || "-",

          noDo: t.NO_SURAT_JALAN || t.NO_INVOICE || "-",

          supplier:
            t.NAMA_SUPPLIER ||
            supplierLookup?.[newKey] ||
            supplierLookup?.[
              `${normalizeText(t.NAMA_BRAND)}|${normalizeText(t.NAMA_BARANG)}`
            ] ||
            "ONLINE NON PKP",

          namaToko: tujuan,

          brand: t.NAMA_BRAND || "-",

          barang: t.NAMA_BARANG || "-",

          imei: "",

          qty: 0,

          hargaSRP:
            masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaSRP || 0,

          hargaGrosir:
            masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaGrosir || 0,

          hargaReseller:
            masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaReseller || 0,

          statusBarang: "TERSEDIA",

          keterangan: "TRANSFER BARANG",
        };
      }

      map[newKey].qty += qty;
    }

    // ======================================
    // 🔥 STOCK KELUAR
    // ======================================

    if (["PENJUALAN", "REJECT", "STOK OPNAME"].includes(metode)) {
      map[skuKey].qty -= Math.abs(Number(t.QTY || 0));
    }
  });

  // ==========================================================
  // 🔥 PATCH ENTERPRISE
  // FORCE HASIL TRANSFER BARANG MASUK KE DETAIL STOCK TOKO
  // TIDAK MENGUBAH LOGIC LAMA
  // ==========================================================

  sorted.forEach((trx) => {
    if (!trx?.IMEI) return;

    const metode = String(trx.PAYMENT_METODE || "").toUpperCase();
    const status = String(trx.STATUS || "").toUpperCase();

    if (metode !== "TRANSFER_MASUK") return;
    if (status !== "APPROVED") return;

    const ownerToko = normalize(
      trx.ke ||
        trx.TOKO_TUJUAN ||
        trx.tokoTujuan ||
        trx.tokoPenerima ||
        trx.NAMA_TOKO
    );

    if (ownerToko !== normalize(namaToko)) {
      return;
    }

    const imei = normalizeImei(trx.IMEI);

    // ======================================
    // JIKA SUDAH ADA JANGAN DITIMPA
    // ======================================

    // ======================================
    // JIKA DATA LAMA (PEMBELIAN)
    // MAKA HAPUS AGAR DIGANTI TRANSFER
    // ======================================

    if (map[imei] && !map[imei].__FORCE_TRANSFER__) {
      delete map[imei];
    }

    // ======================================
    // JIKA SUDAH TRANSFER
    // JANGAN DITIMPA LAGI
    // ======================================

    if (map[imei] && map[imei].__FORCE_TRANSFER__) {
      return;
    }

    // =====================================================
    // FINAL OWNER FILTER
    // =====================================================

    Object.keys(map).forEach((key) => {
      const row = map[key];

      if (!row?.imei) return;

      const imei = normalizeImei(row.imei);

      const owner = finalOwnerTracker[imei];

      const latestOwner = transferOwnerMap[imei];

      if (latestOwner) {
        row.namaToko = latestOwner.toko;

        row.ownerFinal = latestOwner.toko;

        row.keterangan = "TRANSFER BARANG";

        row.statusBarang = "TERSEDIA";
      }

      if (!owner) {
        delete map[key];

        return;
      }

      if (!owner.active) {
        delete map[key];

        return;
      }

      if (normalize(owner.toko) !== normalize(row.namaToko)) {
        delete map[key];

        return;
      }

      row.namaToko = owner.toko;

      row.keterangan =
        owner.metode === "TRANSFER_KELUAR" || owner.metode === "TRANSFER_MASUK"
          ? "TRANSFER BARANG"
          : row.keterangan;
    });

    map[imei] = {
      tanggal: trx.TANGGAL_TRANSAKSI || "-",

      noDo: trx.NO_SURAT_JALAN || trx.NO_INVOICE || "-",

      supplier: trx.NAMA_SUPPLIER || supplierLookup?.[imei] || "ONLINE NON PKP",

      namaToko: ownerToko,

      brand: trx.NAMA_BRAND,

      barang: trx.NAMA_BARANG,

      imei,

      qty: 1,

      hargaSRP:
        masterMap?.[`${trx.NAMA_BRAND}|${trx.NAMA_BARANG}`]?.hargaSRP || 0,

      hargaGrosir:
        masterMap?.[`${trx.NAMA_BRAND}|${trx.NAMA_BARANG}`]?.hargaGrosir || 0,

      hargaReseller:
        masterMap?.[`${trx.NAMA_BRAND}|${trx.NAMA_BARANG}`]?.hargaReseller || 0,

      statusBarang: "TERSEDIA",

      sumberStock: "TRANSFER",

      keterangan: "TRANSFER BARANG",

      __FORCE_TRANSFER__: true,
    };
  });

  Object.keys(map).forEach((key) => {
    const row = map[key];

    if (!row?.imei) {
      if (Number(row.qty) <= 0) {
        delete map[key];
      }
    }
  });

  // =======================================================
  // 🔥 FINAL OWNER SYNC NON IMEI
  // =======================================================

  Object.keys(map).forEach((key) => {
    const row = map[key];

    if (row?.imei) return;

    const owner = normalize(row.namaToko);

    const currentKey = `${owner}|${normalizeText(row.brand)}|${normalizeText(
      row.barang
    )}`;

    if (key !== currentKey) {
      delete map[key];
    }
  });

  // ====================================================
  // FINAL TRANSFER OWNER
  // HANYA TRANSFER APPROVED TERAKHIR
  // ====================================================

  Object.keys(map).forEach((key) => {
    const row = map[key];

    if (!row?.imei) return;

    const imei = normalizeImei(row.imei);

    const owner = finalOwnerTracker[imei];

    if (!owner) {
      delete map[key];
      return;
    }

    if (!owner.active) {
      delete map[key];
      return;
    }

    if (normalize(row.namaToko) !== normalize(owner.toko)) {
      delete map[key];
      return;
    }

    // sinkronkan data owner terakhir
    row.namaToko = owner.toko;

    row.keterangan =
      owner.metode === "TRANSFER_KELUAR" ? "TRANSFER BARANG" : row.keterangan;
  });

  // =======================================================
  // 🔥 FINAL OWNER SYNC
  // IMEI HANYA BOLEH ADA DI SATU TOKO
  // =======================================================

  Object.keys(map).forEach((key) => {
    const row = map[key];

    if (!row?.imei) return;

    const imei = normalizeImei(row.imei);

    const owner = finalOwnerTracker[imei];

    if (!owner) return;

    // bukan owner terakhir
    if (normalize(row.namaToko) !== normalize(owner.toko)) {
      delete map[key];

      return;
    }

    // pastikan nama toko mengikuti owner terakhir
    row.namaToko = owner.toko;
  });

  // =====================================================
  // FINAL RECALCULATE NON IMEI
  // SATUKAN DENGAN ENGINE STOCK OPNAME
  // =====================================================

  Object.keys(map).forEach((key) => {
    const row = map[key];

    if (!row) return;

    // hanya NON IMEI
    if (row.imei) return;

    row.qty = buildFinalNonImeiStock({
      transaksi: sorted,
      toko: row.namaToko,
      brand: row.brand,
      barang: row.barang,
    });

    // jika sudah habis jangan tampil
    if (row.qty <= 0) {
      delete map[key];
    }
  });

  // ======================================
  // 🔥 FINAL CLEAN
  // ======================================
  // ======================================
  // 🔥 FINAL CLEAN
  // ======================================

  let rows = Object.values(map)
    .filter((x) => Number(x.qty || 0) > 0)
    .sort((a, b) => String(a.brand || "").localeCompare(String(b.brand || "")));

  // ======================================
  // 🔥 HILANGKAN BARANG YANG SUDAH TERJUAL
  // DALAM SATU NO INVOICE
  // ======================================

  rows = RemoveSoldItemsInsideInvoice({
    rows,
    transaksi: sorted,
  });

  return rows;
};
