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
      if (metode === "TRANSFER_KELUAR") {
        finalOwnerTracker[imei] = {
          toko:
            t.TOKO_TUJUAN ||
            t.ke ||
            t.tokoTujuan ||
            t.NAMA_TOKO ||
            "-",
  
          active: true,
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
  
        const owner = finalOwnerTracker?.[imei];
  
        // ======================================
        // 🔥 BUKAN OWNER FINAL
        // ======================================
        if (
          !owner?.active ||
          normalize(owner?.toko) !== normalize(namaToko)
        ) {
          delete map[imei];
          return;
        }
  
        // ======================================
        // 🔥 STOCK KELUAR
        // ======================================
        if (
          ["PENJUALAN", "TRANSFER_KELUAR", "REJECT", "STOK OPNAME"].includes(
            metode
          )
        ) {
          delete map[imei];
          return;
        }
  
        map[imei] = {
          tanggal: t.TANGGAL_TRANSAKSI || "-",
  
          noDo: t.NO_INVOICE || "-",
  
          supplier:
            supplierLookup?.[imei] ||
            t.NAMA_SUPPLIER ||
            "-",
  
          namaToko: owner?.toko || t.NAMA_TOKO || "-",
  
          brand: t.NAMA_BRAND || "-",
  
          barang: t.NAMA_BARANG || "-",
  
          imei: t.IMEI,
  
          qty: 1,
  
          hargaSRP:
            masterMap?.[
              `${t.NAMA_BRAND}|${t.NAMA_BARANG}`
            ]?.hargaSRP || 0,
  
          hargaGrosir:
            masterMap?.[
              `${t.NAMA_BRAND}|${t.NAMA_BARANG}`
            ]?.hargaGrosir || 0,
  
          hargaReseller:
            masterMap?.[
              `${t.NAMA_BRAND}|${t.NAMA_BARANG}`
            ]?.hargaReseller || 0,
  
          statusBarang: "TERSEDIA",
  
          keterangan:
            metode === "TRANSFER_MASUK"
              ? "TRANSFER BARANG"
              : metode,
        };
  
        return;
      }
  
      // ======================================
      // 🔥 NON IMEI
      // ======================================
      const skuKey =
        `${normalize(t.NAMA_TOKO)}|` +
        `${normalizeText(t.NAMA_BRAND)}|` +
        `${normalizeText(t.NAMA_BARANG)}`;
  
      if (!map[skuKey]) {
        map[skuKey] = {
          tanggal: t.TANGGAL_TRANSAKSI || "-",
  
          noDo: t.NO_SURAT_JALAN || t.NO_INVOICE || "-",
  
          supplier:
            supplierLookup?.[skuKey] ||
            t.NAMA_SUPPLIER ||
            "-",
  
          namaToko: t.NAMA_TOKO || "-",
  
          brand: t.NAMA_BRAND || "-",
  
          barang: t.NAMA_BARANG || "-",
  
          imei: "",
  
          qty: 0,
  
          hargaSRP:
            masterMap?.[
              `${t.NAMA_BRAND}|${t.NAMA_BARANG}`
            ]?.hargaSRP || 0,
  
          hargaGrosir:
            masterMap?.[
              `${t.NAMA_BRAND}|${t.NAMA_BARANG}`
            ]?.hargaGrosir || 0,
  
          hargaReseller:
            masterMap?.[
              `${t.NAMA_BRAND}|${t.NAMA_BARANG}`
            ]?.hargaReseller || 0,
  
          statusBarang: "TERSEDIA",
  
          keterangan:
            metode === "TRANSFER_MASUK"
              ? "TRANSFER BARANG"
              : metode,
        };
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
        ["PENJUALAN", "TRANSFER_KELUAR", "REJECT", "STOK OPNAME"].includes(
          metode
        )
      ) {
        map[skuKey].qty -= Math.abs(Number(t.QTY || 0));
      }
    });
  
    // ======================================
    // 🔥 DETAIL STOCK FALLBACK
    // ======================================
    Object.values(detailStock || {}).forEach((s) => {
      if (!s?.imei) return;
  
      const cleanImei = normalizeImei(s.imei);
  
      if (map[cleanImei]) return;
  
      if (normalize(s.toko) !== normalize(namaToko)) {
        return;
      }
  
      map[cleanImei] = {
        tanggal: s.updatedAt || s.tanggal || "-",
  
        noDo: "-",
  
        supplier:
          supplierLookup?.[cleanImei] || "-",
  
        namaToko: s.toko || namaToko,
  
        brand: s.brand || "-",
  
        barang: s.namaBarang || "-",
  
        imei: s.imei,
  
        qty: 1,
  
        hargaSRP: 0,
  
        hargaGrosir: 0,
  
        hargaReseller: 0,
  
        statusBarang: "TERSEDIA",
  
        keterangan: "DARI DETAIL STOCK",
      };
    });
  
    // ======================================
    // 🔥 FINAL CLEAN
    // ======================================
    return Object.values(map)
      .filter((x) => Number(x.qty || 0) > 0)
      .sort((a, b) =>
        String(a.brand || "").localeCompare(
          String(b.brand || "")
        )
      );
  };