const normalizeText = (v) =>
  String(v || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
const stockIndexCache = new WeakMap();
const KEY_SEPARATOR = "\u0001";
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
  // Satu array snapshot Firebase hanya dipindai sekali. Pemanggilan berikutnya
  // (satu kali per row tabel) menjadi lookup O(1), tanpa mengubah aturan saldo.
  let stockIndex = stockIndexCache.get(transaksi);

  if (!stockIndex) {
    stockIndex = new Map();

    transaksi.forEach((trx) => {
      if (!trx) return;

      // Hanya transaksi barang non-IMEI yang memengaruhi index ini.
      if (!isNonImeiItem(trx.IMEI)) {
        return;
      }

      const trxToko = normalizeText(
        trx.NAMA_TOKO || trx.namaToko || trx.toko || trx.tokoPengirim
      );

      const trxBrand = normalizeText(trx.NAMA_BRAND || trx.brand);
      const trxBarang = normalizeText(trx.NAMA_BARANG || trx.barang);

      const qty = Math.abs(Number(trx.QTY || trx.qty || 0));

      const metode = normalizeText(
        trx.PAYMENT_METODE || trx.metode || trx.jenis
      );

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

      const key = [trxToko, trxBrand, trxBarang].join(KEY_SEPARATOR);
      stockIndex.set(key, (stockIndex.get(key) || 0) + effect);
    });

    stockIndexCache.set(transaksi, stockIndex);
  }

  const key = [toko, brand, barang].map(normalizeText).join(KEY_SEPARATOR);
  return Math.max(0, stockIndex.get(key) || 0);
};
