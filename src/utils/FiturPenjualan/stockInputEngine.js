// ======================================================
// STOCK INPUT ENGINE
// SINGLE SOURCE OF TRUTH
// TAHAP 2 INPUT BARANG
// ======================================================

const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

const getFinalStatus = (row = {}) => {
  const metode = normalize(
    row.LAST_ACTION || row.PAYMENT_METODE || row.statusPembayaran
  );

  if (
    [
      "PEMBELIAN",
      "REFUND",
      "REJECT",
      "TRANSFER_MASUK",
      "READY_RESALE",
    ].includes(metode)
  ) {
    return "AVAILABLE";
  }

  if (["PENJUALAN", "TRANSFER_KELUAR", "SOLD"].includes(metode)) {
    return "SOLD";
  }

  return "UNKNOWN";
};

export const buildStockInputBarang = ({
  masterBarang = [],
  detailStockLookup = {},
}) => {
  const detailList = Object.values(detailStockLookup || {});

  return masterBarang.map((barang) => {
    const brand = normalize(barang.namaBrand);

    const namaBarang = normalize(barang.namaBarang);

    const isImei = barang.isImei === true || barang.tipeStock === "IMEI";

    // =====================================
    // IMEI
    // =====================================
    if (isImei) {
      const stokImei = detailList.filter(
        (d) =>
          normalize(d.namaBrand) === brand &&
          normalize(d.namaBarang) === namaBarang &&
          getFinalStatus(d) === "AVAILABLE"
      ).length;

      return {
        ...barang,
        stok: stokImei,
      };
    }

    // =====================================
    // NON IMEI
    // =====================================
    const stokNonImei = detailList
      .filter(
        (d) =>
          normalize(d.namaBrand) === brand &&
          normalize(d.namaBarang) === namaBarang
      )
      .reduce((sum, d) => sum + Number(d.qty || d.QTY || d.stok || 0), 0);

    return {
      ...barang,
      stok: stokNonImei,
    };
  });
};
