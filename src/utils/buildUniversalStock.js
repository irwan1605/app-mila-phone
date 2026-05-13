// src/utils/buildUniversalStock.js

export const buildUniversalStock = ({
  transaksi = [],
  detailStock = {},
  filterToko = "semua",
}) => {
  // =====================================
  // 🔥 NORMALIZE
  // =====================================
  const normalize = (v) =>
    String(v || "")
      .trim()
      .toUpperCase();

  const normalizeText = (v) =>
    String(v || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ");

  const normalizeImei = (v) =>
    String(v || "")
      .toLowerCase()
      .replace(/[^0-9]/g, "");

  const map = {};

  // =====================================
  // 🔥 FILTER TRANSAKSI VALID
  // =====================================
  const approvedRows = transaksi.filter(
    (t) =>
      t && ["APPROVED", "REFUND"].includes(String(t.STATUS || "").toUpperCase())
  );

  // =====================================
  // 🔥 IMEI TERJUAL FINAL
  // =====================================
  const soldSet = new Set();

  approvedRows.forEach((t) => {
    if (!t?.IMEI) return;

    const imei = normalizeImei(t.IMEI);

    const metode = String(t.PAYMENT_METODE || "").toUpperCase();

    // =====================================
    // 🔥 PENJUALAN
    // =====================================
    if (metode === "PENJUALAN") {
      soldSet.add(imei);
    }

    // =====================================
    // 🔥 REFUND
    // =====================================
    if (metode === "REFUND") {
      soldSet.delete(imei);
    }
  });

  // =====================================
  // 🔥 PROCESS TRANSAKSI
  // =====================================
  approvedRows.forEach((t) => {
    if (!t) return;

    const metode = String(t.PAYMENT_METODE || "").toUpperCase();

    const toko = t.NAMA_TOKO || t.toko || t.ke || t.tokoPengirim || "-";

    // =====================================
    // 🔥 FILTER TOKO
    // =====================================
    if (filterToko !== "semua" && normalize(toko) !== normalize(filterToko)) {
      return;
    }

    // =====================================
    // 🔥 IMEI
    // =====================================
    if (t.IMEI) {
      const cleanImei = normalizeImei(t.IMEI);

      const key = cleanImei;

      // =====================================
      // 🔥 INIT IMEI
      // =====================================
      if (!map[key]) {
        map[key] = {
          key,

          tanggal: t.TANGGAL_TRANSAKSI || t.tanggal || "-",

          noDo: t.NO_INVOICE || t.noDo || "-",

          supplier: t.NAMA_SUPPLIER || t.SUPPLIER || "-",

          toko,

          namaToko: toko,

          brand: t.NAMA_BRAND || "-",

          barang: t.NAMA_BARANG || "-",

          namaBarang: t.NAMA_BARANG || "-",

          imei: t.IMEI,

          qty: 0,

          hargaSRP: Number(t.HARGA_SRP || 0),

          hargaGrosir: Number(t.HARGA_GROSIR || 0),

          hargaReseller: Number(t.HARGA_RESELLER || 0),

          statusBarang: "TERSEDIA",

          keterangan: t.KETERANGAN || "-",

          lastTransaksi: metode,
        };
      }

      // =====================================
      // 🔥 STOCK MASUK
      // =====================================
      if (
        [
          "PEMBELIAN",
          "TRANSFER_MASUK",
          "REFUND",
          "RETUR",
          "VOID OPNAME",
        ].includes(metode)
      ) {
        map[key] = {
          ...map[key],

          tanggal: t.TANGGAL_TRANSAKSI || t.tanggal || "-",

          noDo: t.NO_INVOICE || t.noDo || "-",

          supplier: t.NAMA_SUPPLIER || t.SUPPLIER || "-",

          toko,

          namaToko: toko,

          brand: t.NAMA_BRAND || "-",

          barang: t.NAMA_BARANG || "-",

          namaBarang: t.NAMA_BARANG || "-",

          imei: t.IMEI,

          qty: 1,

          hargaSRP: Number(t.HARGA_SRP || 0),

          hargaGrosir: Number(t.HARGA_GROSIR || 0),

          hargaReseller: Number(t.HARGA_RESELLER || 0),

          statusBarang: "TERSEDIA",

          keterangan: t.KETERANGAN || "-",

          lastTransaksi: metode,
        };
      }

      // =====================================
      // 🔥 STOCK KELUAR
      // =====================================
      if (["PENJUALAN", "TRANSFER_KELUAR", "STOK OPNAME"].includes(metode)) {
        map[key] = {
          ...map[key],

          qty: 0,

          lastTransaksi: metode,
        };
      }

      return;
    }

    // =====================================
    // 🔥 NON IMEI
    // =====================================
    const skuKey =
      `${normalize(toko)}|` +
      `${normalizeText(t.NAMA_BRAND)}|` +
      `${normalizeText(t.NAMA_BARANG)}`;

    // =====================================
    // 🔥 INIT NON IMEI
    // =====================================
    if (!map[skuKey]) {
      map[skuKey] = {
        key: skuKey,

        tanggal: t.TANGGAL_TRANSAKSI || t.tanggal || "-",

        noDo: t.NO_INVOICE || t.noDo || "-",

        supplier: t.NAMA_SUPPLIER || t.SUPPLIER || "-",

        toko,

        namaToko: toko,

        brand: t.NAMA_BRAND || "-",

        barang: t.NAMA_BARANG || "-",

        namaBarang: t.NAMA_BARANG || "-",

        imei: "",

        qty: 0,

        hargaSRP: Number(t.HARGA_SRP || 0),

        hargaGrosir: Number(t.HARGA_GROSIR || 0),

        hargaReseller: Number(t.HARGA_RESELLER || 0),

        statusBarang: "TERSEDIA",

        keterangan: t.KETERANGAN || "-",

        lastTransaksi: metode,
      };
    }

    const qty = Number(t.QTY || 0);

    // =====================================
    // 🔥 STOCK MASUK
    // =====================================
    if (
      [
        "PEMBELIAN",
        "TRANSFER_MASUK",
        "REFUND",
        "RETUR",
        "VOID OPNAME",
      ].includes(metode)
    ) {
      map[skuKey].qty += Math.abs(qty);

      map[skuKey].lastTransaksi = metode;
    }

    // =====================================
    // 🔥 STOCK KELUAR
    // =====================================
    if (["PENJUALAN", "TRANSFER_KELUAR", "STOK OPNAME"].includes(metode)) {
      map[skuKey].qty -= Math.abs(qty);

      map[skuKey].lastTransaksi = metode;
    }
  });

  // =====================================
  // 🔥 FALLBACK DETAIL STOCK
  // =====================================
  Object.values(detailStock || {}).forEach((s) => {
    if (!s?.imei) return;

    const cleanImei = normalizeImei(s.imei);

    // =====================================
    // 🔥 BARANG TERJUAL
    // =====================================
    if (soldSet.has(cleanImei)) {
      return;
    }

    // =====================================
    // 🔥 DUPLIKAT
    // =====================================
    if (map[cleanImei]) {
      return;
    }

    // =====================================
    // 🔥 FILTER TOKO
    // =====================================
    if (filterToko !== "semua" && normalize(s.toko) !== normalize(filterToko)) {
      return;
    }

    const status = String(s.STATUS || s.status || "").toUpperCase();

    // =====================================
    // 🔥 STATUS AKTIF
    // =====================================
    if (!["AVAILABLE", "REFUND", "READY"].includes(status)) {
      return;
    }

    map[cleanImei] = {
      key: cleanImei,

      tanggal: s.updatedAt || s.tanggal || "-",

      noDo: "-",

      supplier: "-",

      toko: s.toko || "-",

      namaToko: s.toko || "-",

      imei: s.imei,

      brand: s.brand || "-",

      barang: s.namaBarang || "-",

      namaBarang: s.namaBarang || "-",

      qty: 1,

      hargaSRP: Number(s.hargaSRP || 0),

      hargaGrosir: Number(s.hargaGrosir || 0),

      hargaReseller: Number(s.hargaReseller || 0),

      statusBarang: "TERSEDIA",

      keterangan: "DETAIL_STOCK",

      lastTransaksi: s.LAST_ACTION || s.lastAction || "DETAIL_STOCK",
    };
  });

  // =====================================
  // 🔥 FINAL FILTER
  // =====================================
  return (
    Object.values(map)

      // =====================================
      // 🔥 REMOVE STOCK 0
      // =====================================
      .filter((r) => {
        return Number(r.qty || 0) > 0;
      })

      // =====================================
      // 🔥 FINAL CLEAN OBJECT
      // =====================================
      .map((r) => ({
        ...r,

        tanggal: r.tanggal || "-",

        noDo: r.noDo || "-",

        supplier: r.supplier || "-",

        toko: r.toko || "-",

        namaToko: r.namaToko || r.toko || "-",

        brand: r.brand || "-",

        barang: r.barang || "-",

        namaBarang: r.namaBarang || r.barang || "-",

        imei: r.imei || "",

        qty: Number(r.qty || 0),

        hargaSRP: Number(r.hargaSRP || 0),

        hargaGrosir: Number(r.hargaGrosir || 0),

        hargaReseller: Number(r.hargaReseller || 0),

        statusBarang: r.statusBarang || "TERSEDIA",

        keterangan: r.keterangan || "-",
      }))
  );
};
