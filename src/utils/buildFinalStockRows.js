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

const isNonImei = (t) => {
  const imei = String(t?.IMEI || "")
    .trim()
    .toUpperCase();

  return (
    !imei ||
    imei === "-" ||
    imei === "--" ||
    imei === "NON IMEI" ||
    imei === "NON-IMEI" ||
    imei === "NONIMEI"
  );
};

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
    if (!isNonImei(t)) {
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
    // 🔥 NON IMEI FINAL ENGINE
    // ======================================

    const qty = Math.abs(Number(t.QTY || t.qty || t.JUMLAH || t.jumlah || 0));

    const brand = normalizeText(t.NAMA_BRAND);

    const barang = normalizeText(t.NAMA_BARANG);
    
    // ======================================
    // 🔥 SKU KEY FINAL NON IMEI
    // ======================================
    const skuKey =
      `${normalize(namaToko)}|` +
      `${normalizeText(t.NAMA_BRAND)}|` +
      `${normalizeText(t.NAMA_BARANG)}`;

    // ======================================
    // 🔥 TOKO ASAL
    // ======================================
    const tokoAsal = normalize(t.tokoPengirim || t.NAMA_TOKO || "-");

    // ======================================
    // 🔥 TOKO TUJUAN
    // ======================================
    const tokoTujuan = normalize(t.ke || t.tokoTujuan || t.TOKO_TUJUAN || "-");

    // ======================================
    // 🔥 SKU KEY
    // ======================================
    const makeKey = (toko) => `${normalize(toko)}|${brand}|${barang}`;

    // ======================================
    // 🔥 INIT TRACKER
    // ======================================
    if (!map.__NON_IMEI__) {
      map.__NON_IMEI__ = {};
    }

    const tracker = map.__NON_IMEI__;

    // ======================================
    // 🔥 PEMBELIAN / REFUND
    // ======================================
    if (["PEMBELIAN", "REFUND", "TRANSFER_REJECT"].includes(metode)) {
      const key = makeKey(tokoAsal);

      if (!tracker[key]) {
        tracker[key] = {
          qty: 0,
          data: t,
        };
      }

      tracker[key].qty += qty;

      tracker[key].data = t;
    }

    // ======================================
    // 🔥 PENJUALAN
    // ======================================
    if (["PENJUALAN", "REJECT", "STOK OPNAME"].includes(metode)) {
      const key = makeKey(tokoAsal);

      if (!tracker[key]) {
        tracker[key] = {
          qty: 0,
          data: t,
        };
      }

      tracker[key].qty -= qty;

      if (tracker[key].qty < 0) {
        tracker[key].qty = 0;
      }

      tracker[key].data = t;
    }

    // ======================================
    // 🔥 TRANSFER NON IMEI
    // ======================================
    if (metode === "TRANSFER_KELUAR" && tokoTujuan && tokoTujuan !== "-") {
      const asalKey = makeKey(tokoAsal);

      const tujuanKey = makeKey(tokoTujuan);

      // ======================================
      // 🔥 INIT ASAL
      // ======================================
      if (!tracker[asalKey]) {
        tracker[asalKey] = {
          qty: 0,
          data: t,
        };
      }

      // ======================================
      // 🔥 INIT TUJUAN
      // ======================================
      if (!tracker[tujuanKey]) {
        tracker[tujuanKey] = {
          qty: 0,
          data: t,
        };
      }

      // ======================================
      // 🔥 PINDAHKAN STOCK
      // ======================================
      tracker[asalKey].qty -= qty;

      tracker[tujuanKey].qty += qty;

      // ======================================
      // 🔥 ANTI MINUS
      // ======================================
      if (tracker[asalKey].qty < 0) {
        tracker[asalKey].qty = 0;
      }

      tracker[asalKey].data = {
        ...t,
        NAMA_TOKO: tokoAsal,
      };

      tracker[tujuanKey].data = {
        ...t,
        NAMA_TOKO: tokoTujuan,
        PAYMENT_METODE: "TRANSFER_MASUK",
      };
    }
  });

  // ======================================
  // 🔥 BUILD FINAL NON IMEI
  // ======================================
  Object.entries(map.__NON_IMEI__ || {}).forEach(([key, item]) => {
    // ======================================
    // 🔥 HAPUS ROW LAMA
    // ======================================
    delete map[key];

    if (Number(item?.qty || 0) <= 0) {
      return;
    }

    const r = item.data || {};

    const finalKey =
      `${normalize(r.NAMA_TOKO)}|` +
      `${normalizeText(r.NAMA_BRAND)}|` +
      `${normalizeText(r.NAMA_BARANG)}`;

    // ======================================
    // 🔥 PASTIKAN TIDAK DOUBLE
    // ======================================
    delete map[finalKey];

    map[finalKey] = {
      tanggal: r.TANGGAL_TRANSAKSI || "-",

      noDo: r.NO_INVOICE || "-",

      supplier: supplierLookup?.[finalKey] || r.NAMA_SUPPLIER || "-",

      namaToko: r.NAMA_TOKO || "-",

      brand: r.NAMA_BRAND || "-",

      barang: r.NAMA_BARANG || "-",

      imei: "NON IMEI",

      qty: Number(item.qty || 0),

      hargaSRP: masterMap?.[`${r.NAMA_BRAND}|${r.NAMA_BARANG}`]?.hargaSRP || 0,

      hargaGrosir:
        masterMap?.[`${r.NAMA_BRAND}|${r.NAMA_BARANG}`]?.hargaGrosir || 0,

      hargaReseller:
        masterMap?.[`${r.NAMA_BRAND}|${r.NAMA_BARANG}`]?.hargaReseller || 0,

      statusBarang: "TERSEDIA",

      keterangan:
        String(r.PAYMENT_METODE || "").toUpperCase() === "TRANSFER_MASUK"
          ? "TRANSFER BARANG"
          : r.PAYMENT_METODE || "PEMBELIAN",
    };
  });

  // ======================================
  // 🔥 FINAL CLEAN
  // ======================================
  return (
    Object.values(map)
      .filter((x) => {
        const cleanImei = String(x?.imei || "")
          .trim()
          .toUpperCase();

        const isNonImeiRow =
          !cleanImei ||
          cleanImei === "-" ||
          cleanImei === "--" ||
          cleanImei === "NON IMEI" ||
          cleanImei === "NON-IMEI" ||
          cleanImei === "NONIMEI";

        // ======================================
        // 🔥 NON IMEI
        // ======================================
        if (isNonImeiRow) {
          return Number(x.qty || 0) > 0;
        }

        // ======================================
        // 🔥 IMEI
        // ======================================
        return Number(x.qty || 0) > 0;
      })
      // ======================================
      // 🔥 HAPUS DUPLICATE NON IMEI
      // ======================================
      .filter((row, index, self) => {
        const key =
          `${normalize(row.namaToko)}|` +
          `${normalizeText(row.brand)}|` +
          `${normalizeText(row.barang)}|` +
          `${normalizeImei(row.imei)}`;

        return (
          index ===
          self.findIndex((x) => {
            const compareKey =
              `${normalize(x.namaToko)}|` +
              `${normalizeText(x.brand)}|` +
              `${normalizeText(x.barang)}|` +
              `${normalizeImei(x.imei)}`;

            return compareKey === key;
          })
        );
      })
      // ======================================
      // 🔥 SORT
      // ======================================
      .sort((a, b) =>
        String(a.brand || "").localeCompare(String(b.brand || ""))
      )
  );
};
