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

    const ownerToko = normalizeText(
      trx.ke || trx.TOKO_TUJUAN || trx.tokoTujuan || trx.NAMA_TOKO
    );

    const metode = normalizeText(trx.PAYMENT_METODE);

    if (["TRANSFER_MASUK", "TRANSFER BARANG"].includes(metode)) {
      imeiMap[imei] = {
        toko: ownerToko,
        status: "AVAILABLE",
      };
    }

    // ======================================
    // 🔥 FILTER BARANG
    // ======================================
    if (
      trxBrand !== normalizeText(brand) ||
      trxBarang !== normalizeText(barang)
    ) {
      return;
    }

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
        toko: ownerToko,
        status: "AVAILABLE",
      };
    }

    if (metode === "TRANSFER_MASUK" && ownerToko === normalizeText(toko)) {
      imeiMap[imei] = {
        toko: ownerToko,
        status: "AVAILABLE",
        force: true,
      };

      return;
    }

    // ======================================
    // 🔥 TRANSFER KELUAR
    // ======================================
    // ======================================
    // 🔥 TRANSFER KELUAR
    // ======================================

    if (["TRANSFER_KELUAR", "TRANSFER BARANG KELUAR"].includes(metode)) {
      const tujuan =
        trx.TOKO_TUJUAN ||
        trx.ke ||
        trx.tokoTujuan ||
        trx.tokoPenerima ||
        trx.NAMA_TOKO;

      imeiMap[imei] = {
        toko: normalizeText(tujuan),

        // JANGAN HILANGKAN STOCK
        status: "AVAILABLE",

        transfer: true,
      };

      return;
    }

    // ======================================
    // 🔥 REJECT = BALIK OWNER
    // ======================================
    if (metode === "TRANSFER_REJECT") {
      imeiMap[imei] = {

        toko: ownerToko,
    
        status: "AVAILABLE",
    
        ownerHistory: [
    
            ...(imeiMap[imei]?.ownerHistory || []),
    
            ownerToko,
    
        ],
    
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
