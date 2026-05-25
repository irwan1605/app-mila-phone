// ======================================================
// BUILD FINAL NON IMEI STOCK
// FINAL REALTIME STOCK ENGINE
// REFUND + REJECT + TRANSFER + PEMBELIAN
// ======================================================

const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

export const buildFinalNonImeiStock = ({ transaksi = [], toko = "" }) => {
  const stockMap = {};

  // ======================================================
  // LOOP TRANSAKSI
  // ======================================================
  transaksi.forEach((trx) => {
    if (!trx) return;

    // ======================================================
    // STATUS
    // ======================================================
    const status = normalize(trx.STATUS);

    if (!["APPROVED", "REFUND"].includes(status)) {
      return;
    }

    // ======================================================
    // TOKO
    // ======================================================
    const trxToko = normalize(
      trx.NAMA_TOKO ||
        trx.toko ||
        trx.ke ||
        trx.tokoPengirim ||
        trx.tokoAsal ||
        trx.NAMA_TOKO_ASAL ||
        trx.TOKO_ASAL
    );

    if (trxToko !== normalize(toko)) {
      return;
    }

    // ======================================================
    // METODE
    // ======================================================
    const metode = normalize(trx.PAYMENT_METODE || trx.paymentMetode);

    // ======================================================
    // ITEMS
    // ======================================================
    const items =
      Array.isArray(trx.items) && trx.items.length > 0
        ? trx.items
        : [
            {
              namaBarang: trx.NAMA_BARANG || trx.namaBarang,

              namaBrand: trx.NAMA_BRAND || trx.namaBrand,

              qty: trx.QTY || trx.qty,

              imei: trx.IMEI || trx.imei,

              isRefund: trx.IS_REFUND === true,
            },
          ];

    // ======================================================
    // LOOP ITEMS
    // ======================================================
    items.forEach((item) => {
      if (!item) return;

      // ======================================================
      // SKIP IMEI
      // ======================================================
      const imei = normalize(item.imei || item.IMEI);

      const isImei = imei && imei !== "NON-IMEI";

      if (isImei) {
        return;
      }

      // ======================================================
      // DATA
      // ======================================================
      const brand = normalize(item.namaBrand || item.NAMA_BRAND);

      const barang = normalize(item.namaBarang || item.NAMA_BARANG);

      const qty = Number(item.qty || item.QTY || trx.qty || trx.QTY || 0);

      // ======================================================
      // INVALID
      // ======================================================
      if (!brand || !barang || qty <= 0) {
        return;
      }

      // ======================================================
      // FINAL KEY
      // ======================================================
      const key = `${brand}|${barang}`;

      // ======================================================
      // INIT
      // ======================================================
      if (!stockMap[key]) {
        stockMap[key] = 0;
      }

      console.log(
        "REFUND STOCK:",
        barang,
        qty,
        metode
      );

      // ======================================================
      // STOCK MASUK
      // ======================================================
      if (
        [
          "PEMBELIAN",
          "TRANSFER_MASUK",
          "REFUND",
          "REJECT",
          "RETUR",
          "VOID OPNAME",
        ].includes(metode) ||
        trx?.IS_REFUND === true ||
        trx?.statusPembayaran === "REFUND"
      ) {
        stockMap[key] += Number(qty || 0);
      }

      // ======================================================
      // STOCK KELUAR
      // ======================================================
      if (["PENJUALAN", "TRANSFER_KELUAR", "STOK OPNAME"].includes(metode)) {
        stockMap[key] -= qty;
      }
    });
  });

  // ======================================================
  // NO NEGATIVE
  // ======================================================
  Object.keys(stockMap).forEach((k) => {
    if (stockMap[k] < 0) {
      stockMap[k] = 0;
    }
  });

  return stockMap;
};
