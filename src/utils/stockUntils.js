// src/utils/stockUtils.js

export const hitungStokBarang = (transaksi = [], namaBarang) => {
    return transaksi
      .filter((t) => t.NAMA_BARANG === namaBarang && t.STATUS === "Approved")
      .reduce((sum, t) => sum + Number(t.QTY || 1), 0);
  };
  
  export const hitungSemuaStok = (mapTransaksi = {}) => {
    const stok = {};
    Object.values(mapTransaksi).forEach((t) => {
      const key = t.NAMA_BARANG;
      stok[key] = (stok[key] || 0) + (t.IMEI ? 1 : Number(t.QTY || 0));
    });
    return stok;
  };
  