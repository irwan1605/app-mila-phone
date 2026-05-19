// ==========================================
// 🔥 NORMALIZE HELPER
// ==========================================
export const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

export const normalizeText = (v) =>
  String(v || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

export const normalizeImei = (v) =>
  String(v || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

// ==========================================
// 🔥 FINAL UNIVERSAL STOCK ENGINE
// ==========================================
export const buildFinalStock = (transaksi = []) => {
  const imeiMap = {};
  const skuMap = {};
  const soldSkuMap = {};
  const soldImeiMap = {};
  const transferOutMap = {};

  // ==========================================
  // 🔥 SORT TERLAMA → TERBARU
  // ==========================================
  const sorted = [...transaksi].sort((a, b) => {
    const ta = a.UPDATED_AT || a.updatedAt || a.CREATED_AT || a.createdAt || 0;

    const tb = b.UPDATED_AT || b.updatedAt || b.CREATED_AT || b.createdAt || 0;

    return ta - tb;
  });

  sorted.forEach((t) => {
    if (!t) return;

    // ==========================================
    // 🔥 FINAL STATUS UNIVERSAL
    // ==========================================
    const status = String(t.STATUS || t.status || "")
      .trim()
      .toUpperCase();

    // ==========================================
    // 🔥 HANYA DATA VALID
    // ==========================================
    if (!["APPROVED", "REFUND", "SUCCESS"].includes(status)) {
      return;
    }

    const metodeRaw = String(t.PAYMENT_METODE || t.metode || t.jenis || "")
      .trim()
      .toUpperCase();

    const metode =
      metodeRaw === "TRANSFER BARANG" ? "TRANSFER_MASUK" : metodeRaw;

    // ==========================================
    // 🔥 APPROVED TRANSFER DETECTOR
    // ==========================================
    const isApprovedTransfer =
      metodeRaw === "TRANSFER BARANG" &&
      String(t.status || t.STATUS || "")
        .toUpperCase()
        .includes("APPROVED");

    // ==========================================
    // 🔥 AMBIL IMEI DARI ARRAY TRANSFER
    // ==========================================
    const transferImeis = Array.isArray(t.imeis)
      ? t.imeis
      : Array.isArray(t.IMEIS)
      ? t.IMEIS
      : [];

    // ==========================================
    // 🔥 FINAL TOKO OWNER TRANSFER
    // ==========================================
    const tokoFinalTransfer =
      t.ke || t.tokoTujuan || t.TOKO_TUJUAN || t.keToko || "";

    const toko =
      t.NAMA_TOKO || t.namaToko || t.toko || t.dari || t.tokoPengirim || "";

    if (!toko) return;

    // ==========================================
    // 🔥 HAPUS DATA LIAR
    // ==========================================
    if (
      String(t.KETERANGAN || "")
        .toUpperCase()
        .includes("SYNC STOCK OPNAME")
    ) {
      return;
    }

    // ==========================================
    // 🔥 IMEI
    // ==========================================
    if (
      (t.IMEI && normalizeImei(t.IMEI) !== "NON-IMEI") ||
      transferImeis.length > 0
    ) {
      const imeiList = transferImeis.length > 0 ? transferImeis : [t.IMEI];

      imeiList.forEach((rawImei) => {
        const imei = normalizeImei(rawImei);

        if (!imei || imei === "NON-IMEI") {
          return;
        }

        if (!imeiMap[imei]) {
          imeiMap[imei] = {
            id: imei,

            ownerFinal:
              metode === "TRANSFER_MASUK" ? tokoFinalTransfer || toko : toko,

            imei,

            toko: ["TRANSFER_MASUK", "REFUND"].includes(metode)
              ? t.ke || t.tokoTujuan || t.TOKO_TUJUAN || toko
              : toko,

            noDo: t.NO_DO || t.NO_INVOICE || "-",

            supplier: t.NAMA_SUPPLIER || t.SUPPLIER || "-",

            brand: t.NAMA_BRAND || "",

            barang: t.NAMA_BARANG || "",

            qty: metode === "TRANSFER_KELUAR" ? 0 : 1,

            statusBarang: "TERSEDIA",
            status: "TERSEDIA",

            keterangan: metode,

            hargaSRP: Number(t.HARGA_SRP || 0),

            hargaGrosir: Number(t.HARGA_GROSIR || 0),

            hargaReseller: Number(t.HARGA_RESELLER || 0),

            tanggal: t.TANGGAL_TRANSAKSI || t.tanggal || "-",

            createdAt: t.CREATED_AT || t.createdAt || Date.now(),
          };
        }

        // ==========================================
        // 🔥 STOCK MASUK
        // ==========================================
        if (
          [
            "PEMBELIAN",
            "TRANSFER_MASUK",
            "TRANSFER_REJECT",
            "REFUND",
            "RETUR",
            "VOID OPNAME",
          ].includes(metode) ||
          (metodeRaw === "TRANSFER BARANG" &&
            String(t.status || t.STATUS || "")
              .toUpperCase()
              .includes("APPROVED"))
        ) {
          imeiMap[imei] = {
            ...imeiMap[imei],

            imei,

            qty: 1,

            brand: t.NAMA_BRAND || t.brand || imeiMap[imei]?.brand || "-",

            barang: t.NAMA_BARANG || t.barang || imeiMap[imei]?.barang || "-",

            kategori:
              t.KATEGORI ||
              t.KATEGORI_BARANG ||
              t.kategori ||
              imeiMap[imei]?.kategori ||
              "-",

            // ======================================
            // 🔥 TOKO FINAL
            // ======================================
            toko:
              metode === "TRANSFER_MASUK"
                ? t.ke || t.tokoTujuan || t.TOKO_TUJUAN || toko
                : metode === "REFUND"
                ? t.ke || t.tokoTujuan || t.TOKO_TUJUAN || toko
                : metode === "TRANSFER_KELUAR"
                ? "__PINDAH__"
                : toko,

            // ======================================
            // 🔥 TOKO PENERIMA
            // ======================================
            tokoPenerima:
              t.ke ||
              t.tokoTujuan ||
              t.TOKO_TUJUAN ||
              imeiMap[imei]?.tokoPenerima ||
              "-",

            tokoPengirim:
              t.dari ||
              t.tokoPengirim ||
              t.TOKO_PENGIRIM ||
              imeiMap[imei]?.tokoPengirim ||
              "-",

            // ======================================
            // 🔥 NO DO
            // ======================================
            noDo:
              t.NO_DO || t.noDo || t.NO_INVOICE || imeiMap[imei]?.noDo || "-",

            // ======================================
            // 🔥 SUPPLIER
            // ======================================
            supplier:
              t.NAMA_SUPPLIER ||
              t.SUPPLIER ||
              t.pengirim ||
              imeiMap[imei]?.supplier ||
              "-",

            // ======================================
            // 🔥 HARGA
            // ======================================
            hargaSRP: Number(t.HARGA_SRP || imeiMap[imei]?.hargaSRP || 0),

            hargaGrosir: Number(
              t.HARGA_GROSIR || imeiMap[imei]?.hargaGrosir || 0
            ),

            hargaReseller: Number(
              t.HARGA_RESELLER || imeiMap[imei]?.hargaReseller || 0
            ),

            statusBarang: "TERSEDIA",
            status: "TERSEDIA",

            lastTransaksi: metode,

            keterangan: metode,

            tanggal:
              t.TANGGAL_TRANSAKSI || t.tanggal || imeiMap[imei]?.tanggal || "-",

            createdAt: t.CREATED_AT || t.createdAt || Date.now(),
          };
        }

        // ==========================================
        // 🔥 STOCK KELUAR IMEI
        // ==========================================
        if (
          ["PENJUALAN", "REJECT", "STOK OPNAME", "TRANSFER_KELUAR"].includes(
            metode
          )
        ) {
          soldImeiMap[imei] = true;

          imeiMap[imei] = {
            ...imeiMap[imei],

            qty: 0,

            statusBarang: metode === "TRANSFER_KELUAR" ? "PINDAH" : "TERJUAL",

            status: metode === "TRANSFER_KELUAR" ? "PINDAH" : "TERJUAL",

            toko:
              metode === "TRANSFER_KELUAR" ? "__PINDAH__" : imeiMap[imei]?.toko,

            lastTransaksi: metode,

            keterangan: metode,

            tanggal:
              t.TANGGAL_TRANSAKSI || t.tanggal || imeiMap[imei]?.tanggal || "-",

            createdAt: t.CREATED_AT || t.createdAt || Date.now(),
          };
        }
      });

      return;
    }

    // ==========================================
    // 🔥 NON IMEI
    // ==========================================
    // ==========================================
    // 🔥 UNIVERSAL SKU KEY
    // ==========================================
    const baseSkuKey = [
      normalizeText(t.NAMA_BRAND),
      normalizeText(t.NAMA_BARANG),
    ].join("|");

    // ==========================================
    // 🔥 TOKO FINAL
    // ==========================================
    // ==========================================
    // 🔥 FINAL TOKO ENGINE
    // ==========================================
    let finalToko =
      metode === "TRANSFER_MASUK"
        ? t.ke || t.tokoTujuan || t.TOKO_TUJUAN || t.NAMA_TOKO || ""
        : metode === "TRANSFER_KELUAR"
        ? t.tokoPengirim || t.dari || t.NAMA_TOKO || ""
        : t.NAMA_TOKO ||
          t.namaToko ||
          t.toko ||
          t.dari ||
          t.tokoPengirim ||
          t.ke ||
          "";

    // ==========================================
    // 🔥 TRANSFER KELUAR = TOKO PENGIRIM
    // ==========================================
    if (metode === "TRANSFER_KELUAR") {
      finalToko = t.tokoPengirim || t.DARI_TOKO || t.dari || toko;
    }

    // ==========================================
    // 🔥 TRANSFER MASUK = TOKO TUJUAN
    // ==========================================
    if (["TRANSFER_MASUK", "TRANSFER_REJECT", "REFUND"].includes(metode)) {
      finalToko = t.ke || t.tokoTujuan || t.TOKO_TUJUAN || t.NAMA_TOKO || toko;
    }

    // ==========================================
    // 🔥 SKU PER TOKO
    // ==========================================
    const tokoFinalSku = ["TRANSFER_MASUK", "REFUND"].includes(metode)
      ? t.ke || t.tokoTujuan || t.TOKO_TUJUAN || toko
      : t.dari || t.tokoPengirim || toko;

    const skuKey = [
      normalize(finalToko),

      normalizeText(t.NAMA_BRAND || t.brand || "-"),

      normalizeText(t.NAMA_BARANG || t.barang || "-"),
    ].join("|");

    if (!skuMap[skuKey]) {
      skuMap[skuKey] = {
        id: skuKey,

        imei: "NON-IMEI",

        qty: 0,

        brand: t.NAMA_BRAND || t.brand || "-",

        barang: t.NAMA_BARANG || t.barang || "-",

        kategori: t.KATEGORI || t.KATEGORI_BARANG || t.kategori || "-",

        // ======================================
        // 🔥 TOKO FINAL
        // ======================================
        // ======================================
        // 🔥 OWNER FINAL UNIVERSAL
        // ======================================
        toko:
          metode === "TRANSFER_MASUK"
            ? tokoFinalTransfer || toko
            : metode === "REFUND"
            ? tokoFinalTransfer || toko
            : toko,

        // ======================================
        // 🔥 NO DO
        // ======================================
        noDo: t.NO_DO || t.noDo || t.NO_INVOICE || "-",

        // ======================================
        // 🔥 SUPPLIER
        // ======================================
        supplier: t.NAMA_SUPPLIER || t.SUPPLIER || t.pengirim || "-",

        // ======================================
        // 🔥 HARGA
        // ======================================
        hargaSRP: Number(t.HARGA_SRP || t.hargaSRP || 0),

        hargaGrosir: Number(t.HARGA_GROSIR || t.hargaGrosir || 0),

        hargaReseller: Number(t.HARGA_RESELLER || t.hargaReseller || 0),

        statusBarang: "TERSEDIA",
        status: "TERSEDIA",

        lastTransaksi: metode,

        keterangan: metode,

        tanggal: t.TANGGAL_TRANSAKSI || t.tanggal || "-",

        createdAt: t.CREATED_AT || t.createdAt || Date.now(),
      };
    }

    const qty = Number(t.QTY || 0);

    // ==========================================
    // 🔥 TRANSFER KELUAR NON IMEI
    // ==========================================
    if (isApprovedTransfer) {
      const tokoAsal = t.dari || t.tokoPengirim || t.NAMA_TOKO || toko;

      const tokoTujuan = t.ke || t.tokoTujuan || t.TOKO_TUJUAN || toko;

      // ==========================================
      // 🔥 SKU TOKO ASAL
      // ==========================================
      const transferOutKey = [
        normalize(tokoAsal),

        normalizeText(t.NAMA_BRAND || t.brand || "-"),

        normalizeText(t.NAMA_BARANG || t.barang || "-"),
      ].join("|");

      // ==========================================
      // 🔥 SKU TOKO TUJUAN
      // ==========================================
      const transferInKey = [
        normalize(tokoTujuan),

        normalizeText(t.NAMA_BRAND || t.brand || "-"),

        normalizeText(t.NAMA_BARANG || t.barang || "-"),
      ].join("|");

      // ==========================================
      // 🔥 PASTIKAN TOKO ASAL ADA
      // ==========================================
      if (!skuMap[transferOutKey]) {
        skuMap[transferOutKey] = {
          id: transferOutKey,

          imei: "NON-IMEI",

          qty: 0,

          toko: tokoAsal,

          brand: t.NAMA_BRAND || t.brand || "-",

          barang: t.NAMA_BARANG || t.barang || "-",

          kategori: t.KATEGORI || t.KATEGORI_BARANG || t.kategori || "-",

          hargaSRP: Number(t.HARGA_SRP || t.hargaSRP || 0),

          hargaGrosir: Number(t.HARGA_GROSIR || t.hargaGrosir || 0),

          hargaReseller: Number(t.HARGA_RESELLER || t.hargaReseller || 0),

          statusBarang: "TERSEDIA",

          status: "TERSEDIA",
        };
      }

      // ==========================================
      // 🔥 KURANGI TOKO ASAL
      // ==========================================
      skuMap[transferOutKey].qty =
        Number(skuMap[transferOutKey].qty || 0) - Number(qty || 0);

      // ==========================================
      // 🔥 JIKA HABIS → PINDAH
      // ==========================================
      if (Number(skuMap[transferOutKey].qty || 0) <= 0) {
        skuMap[transferOutKey].qty = 0;

        skuMap[transferOutKey].statusBarang = "PINDAH";

        skuMap[transferOutKey].status = "PINDAH";

        skuMap[transferOutKey].toko = "__PINDAH__";
      }

      // ==========================================
      // 🔥 TOKO TUJUAN
      // ==========================================
      if (!skuMap[transferInKey]) {
        skuMap[transferInKey] = {
          id: transferInKey,

          imei: "NON-IMEI",

          qty: 0,

          toko: tokoTujuan,

          brand: t.NAMA_BRAND || t.brand || "-",

          barang: t.NAMA_BARANG || t.barang || "-",

          kategori: t.KATEGORI || t.KATEGORI_BARANG || t.kategori || "-",

          hargaSRP: Number(t.HARGA_SRP || t.hargaSRP || 0),

          hargaGrosir: Number(t.HARGA_GROSIR || t.hargaGrosir || 0),

          hargaReseller: Number(t.HARGA_RESELLER || t.hargaReseller || 0),

          statusBarang: "TERSEDIA",

          status: "TERSEDIA",
        };
      }

      // ==========================================
      // 🔥 TAMBAH TOKO TUJUAN
      // ==========================================
      skuMap[transferInKey].qty =
        Number(skuMap[transferInKey].qty || 0) + Number(qty || 0);

      skuMap[transferInKey].toko = tokoTujuan;

      skuMap[transferInKey].statusBarang = "TERSEDIA";

      skuMap[transferInKey].status = "TERSEDIA";

      return;
    }
    // ==========================================
    // 🔥 STOCK MASUK FINAL NON IMEI
    // ==========================================
    if (
      ["PEMBELIAN", "TRANSFER_MASUK", "TRANSFER BARANG", "REFUND"].includes(
        metode
      ) ||
      isApprovedTransfer
    ) {
      skuMap[skuKey] = {
        ...skuMap[skuKey],

        toko: finalToko,

        qty: Number(skuMap[skuKey]?.qty || 0) + Number(t.QTY || 0),

        statusBarang: "TERSEDIA",
        status: "TERSEDIA",

        lastTransaksi: metode,

        keterangan: metode,

        tanggal:
          t.TANGGAL_TRANSAKSI || t.tanggal || skuMap[skuKey]?.tanggal || "-",

        createdAt: t.CREATED_AT || t.createdAt || Date.now(),
      };
    }

    // ==========================================
    // 🔥 PASTIKAN SKU ADA
    // ==========================================
    if (!skuMap[skuKey]) {
      skuMap[skuKey] = {
        id: skuKey,

        toko: finalToko,

        brand: t.NAMA_BRAND || "",

        barang: t.NAMA_BARANG || "",

        qty: 0,

        statusBarang: "TERSEDIA",
        status: "TERSEDIA",

        noDo: t.NO_DO || t.NO_INVOICE || "-",

        supplier: t.NAMA_SUPPLIER || t.SUPPLIER || "-",

        hargaSRP: Number(t.HARGA_SRP || 0),

        hargaGrosir: Number(t.HARGA_GROSIR || 0),

        hargaReseller: Number(t.HARGA_RESELLER || 0),
      };
    }

    // ==========================================
    // 🔥 STOCK KELUAR NON IMEI
    // ==========================================
    if (["PENJUALAN", "REJECT", "STOK OPNAME"].includes(metode)) {
      soldSkuMap[skuKey] = Number(soldSkuMap[skuKey] || 0) + Number(t.QTY || 0);

      skuMap[skuKey] = {
        ...skuMap[skuKey],

        qty: Number(skuMap[skuKey]?.qty || 0) - Number(t.QTY || 0),

        statusBarang:
          Number(skuMap[skuKey]?.qty || 0) - Number(t.QTY || 0) <= 0
            ? "TERJUAL"
            : "TERSEDIA",

        lastTransaksi: metode,

        keterangan: metode,

        tanggal:
          t.TANGGAL_TRANSAKSI || t.tanggal || skuMap[skuKey]?.tanggal || "-",

        createdAt: t.CREATED_AT || t.createdAt || Date.now(),
      };
    }
  });

  // ==========================================
  // 🔥 REMOVE QTY 0
  // ==========================================
  Object.keys(imeiMap).forEach((key) => {
    if (Number(imeiMap[key]?.qty || 0) <= 0) {
      delete imeiMap[key];
    }
  });

  Object.keys(skuMap).forEach((key) => {
    if (Number(skuMap[key]?.qty || 0) <= 0) {
      delete skuMap[key];
    }
  });

  // ==========================================
  // 🔥 REMOVE DUPLICATE IMEI
  // ==========================================
  const finalImeiMap = {};

  Object.values(imeiMap).forEach((item) => {
    if (!item?.imei) return;

    finalImeiMap[normalizeImei(item.imei)] = item;
  });

  // ==========================================
  // 🔥 FINAL IMEI
  // ==========================================
  // ==========================================
  // 🔥 FINAL FILTER IMEI
  // ==========================================
  const finalImei = Object.values(imeiMap).filter((x) => {
    if (!x) {
      return false;
    }

    // HAPUS QTY HABIS
    if (Number(x.qty || 0) <= 0) {
      return false;
    }

    if (
      String(x.statusBarang || "")
        .toUpperCase()
        .includes("PINDAH")
    ) {
      return false;
    }

    if (String(x.toko || "") === "__PINDAH__") {
      return false;
    }

    // HAPUS TERJUAL
    if (
      String(x.statusBarang || "")
        .toUpperCase()
        .includes("TERJUAL")
    ) {
      return false;
    }

    // HAPUS DATA KOSONG
    if (!String(x.barang || "").trim()) {
      return false;
    }

    if (!String(x.brand || "").trim()) {
      return false;
    }

    if (!String(x.toko || "").trim()) {
      return false;
    }

    return true;
  });

  // ==========================================
  // 🔥 FINAL FILTER NON IMEI
  // ==========================================
  const finalSku = Object.values(skuMap).filter((x) => {
    if (!x) {
      return false;
    }

    // HAPUS QTY HABIS
    if (Number(x.qty || 0) <= 0) {
      return false;
    }

    if (
      String(x.statusBarang || "")
        .toUpperCase()
        .includes("PINDAH")
    ) {
      return false;
    }

    if (String(x.toko || "") === "__PINDAH__") {
      return false;
    }

    // HAPUS TERJUAL
    if (
      String(x.statusBarang || "")
        .toUpperCase()
        .includes("TERJUAL")
    ) {
      return false;
    }

    // HAPUS DATA KOSONG
    if (!String(x.barang || "").trim()) {
      return false;
    }

    if (!String(x.brand || "").trim()) {
      return false;
    }

    if (!String(x.toko || "").trim()) {
      return false;
    }

    // HAPUS KATEGORI KOSONG
    if (!String(x.kategori || "").trim()) {
      return false;
    }

    return true;
  });

  console.log("🔥 FINAL SKU", finalSku);

  console.log("🔥 FINAL IMEI", finalImei);

  // ==========================================
  // 🔥 FINAL RETURN
  // ==========================================
  return [...finalImei, ...finalSku].sort(
    (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)
  );
};

// ==========================================
// 🔥 EXPORT
// ==========================================
export default buildFinalStock;
