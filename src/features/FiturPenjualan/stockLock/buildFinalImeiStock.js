// features/FiturPenjualan/stockLock/buildFinalImeiStock.js

export const buildFinalImeiStock = ({
    transaksi = [],
    toko = "",
  }) => {
    const map = {};
  
    transaksi.forEach((trx) => {
      if (!trx?.IMEI) return;
  
      const imei = String(trx.IMEI).trim();
  
      const metode = String(
        trx.PAYMENT_METODE || ""
      ).toUpperCase();
  
      if (
        [
          "PEMBELIAN",
          "TRANSFER_MASUK",
          "REFUND",
        ].includes(metode)
      ) {
        map[imei] = {
          available: true,
          toko: trx.NAMA_TOKO,
        };
      }
  
      if (
        [
          "PENJUALAN",
          "TRANSFER_KELUAR",
          "REJECT",
        ].includes(metode)
      ) {
        map[imei] = {
          available: false,
          toko: trx.NAMA_TOKO,
        };
      }
    });
  
    return map;
  };