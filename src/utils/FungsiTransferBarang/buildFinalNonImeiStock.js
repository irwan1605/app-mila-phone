// Dipakai oleh TransferBarang dan DetailStockToko.
// Fungsi ini murni: tidak memasang listener Firebase dan tidak mengubah transaksi.
const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

const isNonImeiItem = (imei) => {
  const clean = String(imei || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .toUpperCase();

  return !clean || ["NONIMEI", "NONIMEI.", "NON"].includes(clean);
};

const getStockEffect = (metode, qty) => {
  // Arus masuk: pembelian, refund/retur, dan transaksi transfer masuk/reject.
  if (
    [
      "PEMBELIAN",
      "REFUND",
      "RETUR",
      "TRANSFER_MASUK",
      "TRANSFER_REJECT",
      "TRANSFER BARANG",
    ].includes(metode)
  ) {
    return qty;
  }

  // Arus keluar: penjualan dan transfer dari toko asal.
  if (["PENJUALAN", "TRANSFER_KELUAR", "TRANSFER BARANG KELUAR"].includes(metode)) {
    return -qty;
  }

  return 0;
};

// FINAL REAL STOCK NON-IMEI.
// Letakkan validasi status di sini agar seluruh pemanggil memakai aturan yang sama.
export const buildFinalNonImeiStock = ({
  transaksi = [],
  toko = "",
  brand = "",
  barang = "",
}) => {
  const targetToko = normalizeText(toko);
  const targetBrand = normalizeText(brand);
  const targetBarang = normalizeText(barang);

  // Target belum lengkap: hindari scan seluruh riwayat transaksi saat form belum dipilih.
  if (!targetToko || !targetBrand || !targetBarang || !Array.isArray(transaksi)) {
    return 0;
  }

  let saldo = 0;

  for (const trx of transaksi) {
    if (!trx || !isNonImeiItem(trx.IMEI ?? trx.imei)) continue;

    // Pending, void, dan transaksi tidak disetujui tidak boleh memengaruhi stok.
    const status = normalizeText(trx.STATUS ?? trx.status);
    if (!["APPROVED", "REFUND"].includes(status)) continue;

    const trxToko = normalizeText(
      trx.NAMA_TOKO || trx.namaToko || trx.toko || trx.tokoPengirim
    );
    if (trxToko !== targetToko) continue;

    if (normalizeText(trx.NAMA_BRAND || trx.brand) !== targetBrand) continue;
    if (normalizeText(trx.NAMA_BARANG || trx.barang) !== targetBarang) continue;

    const qty = Math.abs(Number(trx.QTY ?? trx.qty ?? 0));
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const metode = normalizeText(trx.PAYMENT_METODE || trx.metode || trx.jenis);
    saldo += getStockEffect(metode, qty);
  }

  // Stok tidak pernah dikembalikan sebagai nilai negatif.
  return Math.max(0, saldo);
};
