const normalizeText = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

// ======================================
// 🔥 GET FINAL STOCK NON IMEI
// ======================================
export const getAvailableNonImeiStock = ({
  transaksi = [],
  toko = "",
  brand = "",
  barang = "",
}) => {
  let saldo = 0;

  transaksi.forEach((trx) => {
    if (!trx) return;

    // ======================================
    // 🔥 SKIP IMEI
    // ======================================
    if (trx.IMEI && String(trx.IMEI).trim().toUpperCase() !== "NON IMEI") {
      return;
    }

    const trxToko = normalizeText(trx.NAMA_TOKO || trx.toko || trx.namaToko);

    const trxBrand = normalizeText(trx.NAMA_BRAND);

    const trxBarang = normalizeText(trx.NAMA_BARANG);

    // ======================================
    // 🔥 FILTER BARANG
    // ======================================
    if (
      trxToko !== normalizeText(toko) ||
      trxBrand !== normalizeText(brand) ||
      trxBarang !== normalizeText(barang)
    ) {
      return;
    }

    const metode = normalizeText(trx.PAYMENT_METODE);

    const qty = Number(trx.QTY || 0);

    // ======================================
    // 🔥 STOCK MASUK
    // ======================================
    if (["PEMBELIAN", "TRANSFER_MASUK", "REFUND", "RETUR"].includes(metode)) {
      saldo += qty;
    }

    // ======================================
    // 🔥 STOCK KELUAR
    // ======================================
    if (["PENJUALAN", "TRANSFER_KELUAR"].includes(metode)) {
      saldo -= qty;
    }
  });

  return saldo < 0 ? 0 : saldo;
};
