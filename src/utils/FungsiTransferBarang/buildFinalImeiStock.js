const normalizeText = (v) =>
  String(v || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

const normalizeImei = (v) =>
  String(v || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .toUpperCase();

// ======================================
// 🔥 FINAL IMEI STOCK ENGINE
// ======================================
export const buildFinalImeiStock = ({
  transaksi = [],
  toko = "",
  brand = "",
  barang = "",
}) => {
  const imeiMap = {};

  // ======================================
  // 🔥 SORT TERBARU
  // ======================================
  const sorted = [...transaksi].sort((a, b) => {
    const ta = a.UPDATED_AT || a.updatedAt || a.CREATED_AT || a.createdAt || 0;

    const tb = b.UPDATED_AT || b.updatedAt || b.CREATED_AT || b.createdAt || 0;

    return ta - tb;
  });

  sorted.forEach((trx) => {
    if (!trx) return;

    const imei = normalizeImei(trx.IMEI);

    // ======================================
    // 🔥 SKIP NON IMEI
    // ======================================
    if (!imei || ["NONIMEI", "NON IMEI", "NON-IMEI"].includes(imei)) {
      return;
    }

    const trxBrand = normalizeText(trx.NAMA_BRAND);

    const trxBarang = normalizeText(trx.NAMA_BARANG);

    const trxToko = normalizeText(trx.NAMA_TOKO);

    // ======================================
    // 🔥 FILTER BARANG
    // ======================================
    if (
      trxBrand !== normalizeText(brand) ||
      trxBarang !== normalizeText(barang)
    ) {
      return;
    }

    const metode = normalizeText(trx.PAYMENT_METODE);

    // ======================================
    // 🔥 PEMBELIAN
    // ======================================
    if (metode === "PEMBELIAN") {
      imeiMap[imei] = {
        toko: trxToko,
        status: "AVAILABLE",
      };
    }

    // ======================================
    // 🔥 REFUND
    // ======================================
    if (["REFUND", "RETUR"].includes(metode)) {
      imeiMap[imei] = {
        toko: trxToko,
        status: "AVAILABLE",
      };
    }

    // ======================================
    // 🔥 TRANSFER MASUK
    // ======================================
    if (["TRANSFER_MASUK", "TRANSFER BARANG"].includes(metode)) {
      imeiMap[imei] = {
        toko: trxToko,
        status: "AVAILABLE",
      };
    }

    // ======================================
    // 🔥 TRANSFER KELUAR
    // ======================================
    if (["TRANSFER_KELUAR", "TRANSFER BARANG KELUAR"].includes(metode)) {
      imeiMap[imei] = {
        toko: trxToko,
        status: "OUT",
      };
    }

    // ======================================
    // 🔥 REJECT = BALIK OWNER
    // ======================================
    if (metode === "TRANSFER_REJECT") {
      imeiMap[imei] = {
        toko: trxToko,
        status: "AVAILABLE",
      };
    }

    // ======================================
    // 🔥 PENJUALAN
    // ======================================
    if (metode === "PENJUALAN") {
      imeiMap[imei] = {
        toko: trxToko,
        status: "SOLD",
      };
    }
  });

  // ======================================
  // 🔥 FILTER OWNER FINAL
  // ======================================
  const finalStock = Object.entries(imeiMap).filter(([_, item]) => {
    return item.status === "AVAILABLE" && item.toko === normalizeText(toko);
  });

  console.log("🔥 FINAL IMEI STOCK", {
    toko,
    brand,
    barang,
    qty: finalStock.length,
  });

  return {
    qty: finalStock.length,

    imeis: finalStock.map(([imei]) => imei),
  };
};
