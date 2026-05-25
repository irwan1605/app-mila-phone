const normalizeText = (v) =>
  String(v || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

// ======================================
// 🔥 DETECT NON IMEI
// ======================================
const isNonImeiItem = (imei) => {
  const clean = String(imei || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .toUpperCase();

  return !clean || ["NONIMEI", "NONIMEI.", "NON", "-", ""].includes(clean);
};

// ======================================
// 🔥 FINAL REAL STOCK NON IMEI
// ======================================
export const buildFinalNonImeiStock = ({
  transaksi = [],
  toko = "",
  brand = "",
  barang = "",
}) => {
  let saldo = 0;

  transaksi.forEach((trx) => {
    if (!trx) return;

    // ======================================
    // 🔥 HANYA NON IMEI
    // ======================================
    if (!isNonImeiItem(trx.IMEI)) {
      return;
    }

    // ======================================
    // 🔥 FILTER TOKO
    // ======================================
    const trxToko = normalizeText(
      trx.NAMA_TOKO || trx.namaToko || trx.toko || trx.tokoPengirim
    );

    if (trxToko !== normalizeText(toko)) {
      return;
    }

    // ======================================
    // 🔥 FILTER BRAND
    // ======================================
    const trxBrand = normalizeText(trx.NAMA_BRAND || trx.brand);

    if (trxBrand !== normalizeText(brand)) {
      return;
    }

    // ======================================
    // 🔥 FILTER BARANG
    // ======================================
    const trxBarang = normalizeText(trx.NAMA_BARANG || trx.barang);

    if (trxBarang !== normalizeText(barang)) {
      return;
    }

    // ======================================
    // 🔥 QTY
    // ======================================
    const qty = Number(trx.QTY || trx.qty || 0);

    // ======================================
    // 🔥 METODE
    // ======================================
    const metode = normalizeText(trx.PAYMENT_METODE || trx.metode || trx.jenis);

    // ======================================
    // 🔥 STOCK MASUK
    // ======================================
    if (
      [
        "PEMBELIAN",
        "TRANSFER_MASUK",
        "TRANSFER BARANG",
        "REFUND",
        "TRANSFER_REJECT",
        "RETUR",
      ].includes(metode)
    ) {
      saldo += qty;
    }

    // ======================================
    // 🔥 STOCK KELUAR
    // ======================================
    if (
      ["PENJUALAN", "TRANSFER_KELUAR", "TRANSFER BARANG KELUAR"].includes(
        metode
      )
    ) {
      saldo -= qty;
    }
  });

  console.log("🔥 FINAL NON IMEI STOCK:", {
    toko,
    brand,
    barang,
    saldo,
  });

  return saldo < 0 ? 0 : saldo;
};
