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
    // ======================================
    // 🔥 TRANSFER KELUAR
    // ======================================
    if (metode === "TRANSFER_KELUAR") {
      finalOwnerTracker[imei] = {
        toko:
          t.TOKO_TUJUAN ||
          t.ke ||
          t.tokoTujuan ||
          t.tokoPenerima ||
          t.NAMA_TOKO ||
          "-",

        active: true,

        metode: "TRANSFER_KELUAR",

        asal: t.NAMA_TOKO || t.tokoPengirim || t.dari || "-",

        tujuan: t.TOKO_TUJUAN || t.ke || t.tokoTujuan || t.tokoPenerima || "-",

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
    const cleanImei = normalizeImei(t.IMEI);

    const isNonImei =
      !cleanImei || cleanImei === "NONIMEI" || cleanImei === "NON-IMEI";

    // ======================================
    // 🔥 IMEI
    // ======================================
    if (!isNonImei) {
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
      // 🔥 BUKAN MILIK TOKO INI
      // ======================================
      if (!owner?.active || normalize(finalOwnerToko) !== normalize(namaToko)) {
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
    const skuKey = `${normalize(t.NAMA_TOKO)}|${normalizeText(
      t.NAMA_BRAND
    )}|${normalizeText(t.NAMA_BARANG)}`;

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
    // 🔥 STOCK KELUAR
    // ======================================
    if (
      ["PENJUALAN", "TRANSFER_KELUAR", "REJECT", "STOK OPNAME"].includes(metode)
    ) {
      map[skuKey].qty -= Math.abs(Number(t.QTY || 0));
    }
  });

  // ======================================
  // 🔥 FINAL CLEAN
  // ======================================
  return Object.values(map)
    .filter((x) => Number(x.qty || 0) > 0)
    .sort((a, b) => String(a.brand || "").localeCompare(String(b.brand || "")));
};
