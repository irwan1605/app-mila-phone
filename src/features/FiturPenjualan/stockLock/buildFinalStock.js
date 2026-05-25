// =====================================================
// BUILD FINAL STOCK
// SINGLE SOURCE OF TRUTH
// =====================================================

const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

export const buildFinalStock = ({ transaksi = [], toko = "" }) => {
  const map = {};

  transaksi.forEach((trx) => {
    if (!trx) return;

    const status = normalize(trx.STATUS);

    if (status !== "APPROVED") return;

    const tokoDb = normalize(trx.NAMA_TOKO || trx.toko);

    if (tokoDb !== normalize(toko)) return;

    const metode = normalize(trx.PAYMENT_METODE);

    const key =
      `${normalize(trx.NAMA_BRAND || trx.namaBrand)}|` +
      `${normalize(trx.NAMA_BARANG || trx.namaBarang)}`;

    if (!map[key]) {
      map[key] = 0;
    }

    const qty = Number(trx.QTY || trx.qty || 0);

    // ================= MASUK =================
    if (
      [
        "PEMBELIAN",
        "TRANSFER_MASUK",
        "REFUND",
        "STOK OPNAME",
        "INPUT_STOK",
      ].includes(metode)
    ) {
      map[key] += qty;
    }

    // ================= KELUAR =================
    if (["PENJUALAN", "TRANSFER_KELUAR", "REJECT"].includes(metode)) {
      map[key] -= qty;
    }
  });

  return map;
};
