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
    const qty = Math.abs(Number(trx.QTY || trx.qty || 0));

    // ======================================
    // 🔥 METODE
    // ======================================
    const metode = normalizeText(trx.PAYMENT_METODE || trx.metode || trx.jenis);

    // =============================
    // LETAKKAN CODE BARU DI SINI
    // =============================

    const effect = (() => {
      switch (metode) {
        case "PEMBELIAN":
        case "REFUND":
        case "RETUR":
        case "TRANSFER_MASUK":
        case "TRANSFER_REJECT":
        case "TRANSFER BARANG":
          return qty;

        case "PENJUALAN":
        case "TRANSFER_KELUAR":
        case "TRANSFER BARANG KELUAR":
          return -qty;

        default:
          return 0;
      }
    })();

    saldo += effect;
  });

  saldo = Math.max(0, saldo);

  console.log("🔥 FINAL NON IMEI STOCK:", {
      toko,
      brand,
      barang,
      saldo,
  });
  
  return saldo;
};
