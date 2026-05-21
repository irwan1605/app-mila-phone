// src/utils/buildFinalStockRows.js

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
  // ======================================
  // 🔥 FINAL OWNER TRACKER NON IMEI
  // key = BRAND|BARANG|NO_SURAT_JALAN
  // ======================================
  const nonImeiOwnerTracker = {};

  // ======================================
  // 🔥 FINAL OWNER TRACKER
  // ======================================
  const finalOwnerTracker = {};

  const sorted = [...transaksi].sort(
    (a, b) =>
      new Date(a.CREATED_AT || 0).getTime() -
      new Date(b.CREATED_AT || 0).getTime()
  );

  sorted.forEach((t) => {
    if (!t?.IMEI) return;

    const imei = normalizeImei(t.IMEI);

    const metode = String(t.PAYMENT_METODE || "").toUpperCase();

    const status = String(t.STATUS || "").toUpperCase();

    // ======================================
    // 🔥 FORCE HILANGKAN DARI TOKO PENGIRIM
    // ======================================
    if (metode === "TRANSFER_KELUAR") {
      const tokoPengirim = t.NAMA_TOKO || t.tokoPengirim || t.dari || "-";

      // ======================================
      // 🔥 JIKA SEDANG MEMBANGUN STOCK
      // TOKO PENGIRIM → SKIP TOTAL
      // ======================================
      if (normalize(tokoPengirim) === normalize(namaToko)) {
        delete map[imei];
        return;
      }
    }

    if (!["APPROVED", "REFUND"].includes(status)) return;

    // ======================================
    // 🔥 STOCK MASUK
    // ======================================
    if (
      [
        "PEMBELIAN",
        "TRANSFER_MASUK",
        "REFUND",
        "TRANSFER_REJECT",
        "VOID OPNAME",
      ].includes(metode)
    ) {
      finalOwnerTracker[imei] = {
        toko: t.NAMA_TOKO || "-",
        active: true,
      };

      return;
    }

    // ======================================
    // 🔥 TRANSFER KELUAR
    // ======================================
    if (metode === "TRANSFER_KELUAR") {
      const tujuanFinal =
        t.TOKO_TUJUAN || t.ke || t.tokoTujuan || t.tokoPenerima || "-";

      // ======================================
      // 🔥 FINAL OWNER PINDAH KE PENERIMA
      // ======================================
      finalOwnerTracker[imei] = {
        toko: tujuanFinal,

        active: true,

        metode: "TRANSFER_KELUAR",

        asal: t.NAMA_TOKO || t.tokoPengirim || t.dari || "-",

        tujuan: tujuanFinal,

        isRefundTransfer:
          String(t.IS_REFUND_TRANSFER || "").toUpperCase() === "TRUE" ||
          String(t.SUMBER_STOCK || "").toUpperCase() === "REFUND" ||
          String(t.LAST_ACTION || "").toUpperCase() === "REFUND",
      };

      return;
    }

    // ======================================
    // 🔥 STOCK KELUAR
    // ======================================
    if (["PENJUALAN", "REJECT", "STOK OPNAME"].includes(metode)) {
      finalOwnerTracker[imei] = {
        toko: t.NAMA_TOKO || "-",
        active: false,
      };
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
    if (t.IMEI && normalizeImei(t.IMEI) !== "NON-IMEI") {
      const imei = normalizeImei(t.IMEI);

      // ======================================
      // 🔥 FINAL OWNER
      // ======================================
      const owner = finalOwnerTracker?.[imei] || {};

      // ======================================
      // 🔥 FALLBACK TRANSFER MASUK
      // ======================================
      const currentToko = t.NAMA_TOKO || t.toko || t.ke || t.tokoTujuan || "-";

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
      const finalOwnerToko = owner?.toko || currentToko;

      // ======================================
      // 🔥 HAPUS IMEI DARI TOKO PENGIRIM
      // ======================================
      const tokoPengirim = t.NAMA_TOKO || t.tokoPengirim || t.dari || "-";

      if (
        metode === "TRANSFER_KELUAR" &&
        normalize(tokoPengirim) === normalize(namaToko)
      ) {
        delete map[imei];
        return;
      }

      // ======================================
      // 🔥 BUKAN MILIK TOKO INI
      // ======================================
      // ======================================
      // 🔥 FINAL OWNER ONLY
      // ======================================
      if (!owner?.active) {
        delete map[imei];
        return;
      }

      // ======================================
      // 🔥 BUKAN TOKO PEMILIK FINAL
      // ======================================
      if (normalize(finalOwnerToko) !== normalize(namaToko)) {
        // ======================================
        // 🔥 HAPUS DARI TOKO LAMA
        // ======================================
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

      map[imei] = {
        tanggal: t.TANGGAL_TRANSAKSI || "-",

        noDo: t.NO_INVOICE || "-",

        supplier: supplierLookup?.[imei] || t.NAMA_SUPPLIER || "-",

        namaToko: owner?.toko || t.NAMA_TOKO || "-",

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
    // 🔥 TOKO FINAL NON IMEI
    // ======================================
    const finalToko = t.NAMA_TOKO || t.toko || "-";

    // ======================================
    // 🔥 UNIQUE TRANSFER KEY
    // ======================================
    // ======================================
    // 🔥 FINAL TRANSFER REF
    // WAJIB SAMA ANTARA
    // TRANSFER_KELUAR & TRANSFER_MASUK
    // ======================================
    const transferRef =
      t.NO_TRANSFER ||
      t.NO_MUTASI ||
      t.NO_SURAT_JALAN ||
      t.NO_INVOICE ||
      "NOREF";

    // ======================================
    // 🔥 BASE SKU
    // ======================================
    const baseSku =
      `${normalizeText(t.NAMA_BRAND)}|` +
      `${normalizeText(t.NAMA_BARANG)}|` +
      `${normalizeText(transferRef)}`;
    // ======================================
    // 🔥 TRACK OWNER FINAL
    // ======================================
    // ======================================
    // 🔥 FINAL OWNER NON IMEI
    // ======================================
    if (
      [
        "PEMBELIAN",
        "TRANSFER_MASUK",
        "REFUND",
        "TRANSFER_REJECT",
        "VOID OPNAME",
      ].includes(metode)
    ) {
      nonImeiOwnerTracker[baseSku] = t.NAMA_TOKO || "-";
    }

    // ======================================
    // 🔥 TRANSFER KELUAR
    // OWNER PINDAH KE TOKO TUJUAN
    // ======================================
    if (metode === "TRANSFER_KELUAR") {
      nonImeiOwnerTracker[baseSku] =
        t.TOKO_TUJUAN || t.ke || t.tokoTujuan || t.tokoPenerima || "-";
    }

    // ======================================
    // 🔥 FINAL OWNER ONLY
    // ======================================
    const finalOwnerToko = nonImeiOwnerTracker[baseSku] || t.NAMA_TOKO;

    // ======================================
    // 🔥 BUKAN OWNER FINAL
    // ======================================
    if (normalize(finalOwnerToko) !== normalize(namaToko)) {
      return;
    }

    // ======================================
    // 🔥 HILANGKAN STOCK DARI TOKO PENGIRIM
    // ======================================
    if (metode === "TRANSFER_KELUAR") {
      const tokoPengirim = t.NAMA_TOKO || t.tokoPengirim || t.dari || "-";

      // ======================================
      // 🔥 SKU TOKO PENGIRIM
      // ======================================
      const pengirimSkuKey =
        `${normalize(tokoPengirim)}|` +
        `${normalizeText(t.NAMA_BRAND)}|` +
        `${normalizeText(t.NAMA_BARANG)}|` +
        `${normalizeText(transferRef)}`;

      // ======================================
      // 🔥 JIKA SEDANG BUILD TOKO PENGIRIM
      // MAKA HAPUS STOCK NYA
      // ======================================
      if (normalize(tokoPengirim) === normalize(namaToko)) {
        delete map[pengirimSkuKey];
      }

      return;
    }

    // ======================================
    // 🔥 SKU FINAL
    // ======================================
    // ======================================
    // 🔥 SKU FINAL UNIQUE
    // ======================================
    const skuKey =
      `${normalize(finalOwnerToko)}|` +
      `${normalizeText(t.NAMA_BRAND)}|` +
      `${normalizeText(t.NAMA_BARANG)}|` +
      `${normalizeText(transferRef)}`;

    // ======================================
    // 🔥 TRACK TRANSFER NON IMEI
    // ======================================
    const isTransferNonImei = metode === "TRANSFER_MASUK";

    const isRefundTransfer =
      String(t.SUMBER_STOCK || "").toUpperCase() === "REFUND";

    if (!map[skuKey]) {
      map[skuKey] = {
        tanggal: t.TANGGAL_TRANSAKSI || "-",

        noDo: t.NO_SURAT_JALAN || t.NO_INVOICE || "-",

        supplier: supplierLookup?.[skuKey] || t.NAMA_SUPPLIER || "-",

        namaToko: t.NAMA_TOKO || "-",

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

        keterangan: isRefundTransfer
          ? "TRANSFER REFUND"
          : isTransferNonImei
          ? "TRANSFER BARANG"
          : metode,

        sumberStock: isRefundTransfer ? "REFUND" : "NORMAL",
      };
    }

    // ======================================
    // 🔥 STOCK MASUK
    // ======================================
    // ======================================
    // 🔥 STOCK MASUK FINAL
    // ======================================
    if (
      ["PEMBELIAN", "TRANSFER_REJECT", "REFUND", "VOID OPNAME"].includes(metode)
    ) {
      map[skuKey].qty += Math.abs(Number(t.QTY || 0));
    }

    // ======================================
    // 🔥 TRANSFER MASUK
    // ======================================
    // overwrite qty final
    // ======================================
    if (metode === "TRANSFER_MASUK") {
      map[skuKey].qty = Math.abs(Number(t.QTY || 0));
    }

    // ======================================
    // 🔥 TRACK LAST OWNER NON IMEI
    // ======================================
    map[skuKey].lastOwner = t.NAMA_TOKO || "-";

    map[skuKey].lastMetode = metode;

    // ======================================
    // 🔥 STOCK KELUAR
    // ======================================
    // ======================================
    // 🔥 STOCK KELUAR FINAL
    // ======================================
    if (["PENJUALAN", "REJECT", "STOK OPNAME"].includes(metode)) {
      map[skuKey].qty -= Math.abs(Number(t.QTY || 0));
    }

    // ======================================
    // 🔥 FINAL HAPUS STOCK TOKO PENGIRIM
    // ======================================
    if (metode === "TRANSFER_KELUAR") {
      const tokoPengirim = t.NAMA_TOKO || t.tokoPengirim || t.dari || "-";

      // ======================================
      // 🔥 SKU PENGIRIM FINAL
      // ======================================
      const pengirimFinalKey =
        `${normalize(tokoPengirim)}|` +
        `${normalizeText(t.NAMA_BRAND)}|` +
        `${normalizeText(t.NAMA_BARANG)}|` +
        `${normalizeText(transferRef)}`;

      // ======================================
      // 🔥 HAPUS TOTAL DATA LIAR
      // ======================================
      delete map[pengirimFinalKey];

      // ======================================
      // 🔥 JANGAN SIMPAN STOCK 0
      // ======================================
      if (map[skuKey]) {
        map[skuKey].qty = 0;
        map[skuKey].lastMetode = "TRANSFER_KELUAR";
      }

      return;
    }
  });

  // ======================================
  // 🔥 FINAL CLEAN
  // ======================================
  return (
    Object.values(map)
      // ======================================
      // 🔥 NON IMEI TRANSFER
      // ======================================
      .filter((x) => {
        // ======================================
        // 🔥 IMEI
        // ======================================
        if (x.imei) {
          return Number(x.qty) > 0;
        }

        // ======================================
        // 🔥 NON IMEI TRANSFER
        // ======================================
        // ======================================
        // 🔥 NON IMEI TRANSFER FINAL
        // ======================================
        if (x.lastMetode === "TRANSFER_MASUK") {
          return Number(x.qty || 0) > 0;
        }

        // ======================================
        // 🔥 NORMAL
        // ======================================
        // ======================================
        // 🔥 HAPUS DATA LIAR STOCK 0
        // ======================================
        if (!x || Number(x.qty || 0) <= 0) {
          return false;
        }

        return true;
      })
      .sort((a, b) =>
        String(a.brand || "").localeCompare(String(b.brand || ""))
      )
  );
};
