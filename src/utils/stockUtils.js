// =====================================================
// stockUtils.js
// SUMBER STOK GLOBAL (SINGLE SOURCE OF TRUTH)
// =====================================================

/**
 * Hitung stok sebuah barang di 1 toko
 * @param {Object} transaksiToko - data dari /toko/{id}/transaksi
 * @param {String} namaBarang
 * @returns {Number} stok akhir
 */
export function hitungStokBarang(transaksiToko = {}, namaBarang) {
    let masuk = 0;
    let keluar = 0;
  
    Object.values(transaksiToko).forEach((t) => {
      if (!t) return;
      if (t.NAMA_BARANG !== namaBarang) return;
      if (t.STATUS !== "Approved") return;
  
      const qty = Number(t.QTY || 0);
  
      if (["PEMBELIAN", "TRANSFER_MASUK"].includes(t.PAYMENT_METODE)) {
        masuk += qty;
      }
  
      if (["PENJUALAN", "TRANSFER_KELUAR"].includes(t.PAYMENT_METODE)) {
        keluar += qty;
      }
    });
  
    return masuk - keluar;
  }
  
  /**
   * Hitung stok SEMUA barang dalam 1 toko
   * @param {Object} transaksiToko
   * @returns {Object} { [namaBarang]: stok }
   */
  export function hitungSemuaStok(transaksiToko = {}) {
    const map = {};
  
    Object.values(transaksiToko).forEach((t) => {
      if (!t) return;
      if (t.STATUS !== "Approved") return;
  
      const nama = t.NAMA_BARANG;
      const qty = Number(t.QTY || 0);
  
      if (!map[nama]) map[nama] = 0;
  
      if (["PEMBELIAN", "TRANSFER_MASUK"].includes(t.PAYMENT_METODE)) {
        map[nama] += qty;
      }
  
      if (["PENJUALAN", "TRANSFER_KELUAR"].includes(t.PAYMENT_METODE)) {
        map[nama] -= qty;
      }
    });
  
    return map;
  }
  
  /**
   * Hitung stok berbasis IMEI (HANDPHONE / MOTOR)
   * IMEI yang sudah LOCKED TIDAK dihitung
   */
  export function hitungStokIMEI(transaksiToko = {}, namaBarang) {
    const imeiSet = new Set();
  
    Object.values(transaksiToko).forEach((t) => {
      if (!t) return;
      if (t.STATUS !== "Approved") return;
      if (t.NAMA_BARANG !== namaBarang) return;
  
      if (t.IMEI && t.PAYMENT_METODE === "PEMBELIAN") {
        imeiSet.add(t.IMEI);
      }
  
      if (t.IMEI && ["PENJUALAN", "TRANSFER_KELUAR"].includes(t.PAYMENT_METODE)) {
        imeiSet.delete(t.IMEI);
      }
    });
  
    return Array.from(imeiSet);
  }
  