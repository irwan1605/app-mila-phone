// features/FiturPenjualan/stockLock/stockOwnerTracker.js

export const buildStockOwnerTracker = (transaksi = []) => {
  const map = {};

  transaksi.forEach((trx) => {
    if (!trx?.IMEI) return;

    const imei = String(trx.IMEI).trim();

    map[imei] = {
      toko: trx.NAMA_TOKO,
      metode: trx.PAYMENT_METODE,
      tanggal: trx.TANGGAL,
    };
  });

  return map;
};
