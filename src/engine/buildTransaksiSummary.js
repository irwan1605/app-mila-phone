// ==========================================================
// buildTransaksiSummary.js
// Enterprise Transaction Engine
// PT Mila Media Telekomunikasi
//
// Author : ChatGPT
// Version : 1.0
//
// Tujuan:
// Mengolah SELURUH transaksi hanya SATU KALI
// kemudian menghasilkan berbagai summary:
//
// ✓ activeImeiSet
// ✓ imeiTerjual
// ✓ refundAvailableSet
// ✓ refundSoldSet
// ✓ masterPembelianActiveMap
// ✓ finalOwnerTracker
// ✓ refundFinalTracker
// ✓ imeiTransferTracker
// ✓ imeiFinalMap
//
// Seluruh Dashboard cukup memanggil:
//
// const transaksiSummary = useMemo(
//     ()=>buildTransaksiSummary(...),
//     [...]
// )
//
// ==========================================================

import {
  normalize,
  normalizeText,
  normalizeImei,
  buildSkuKey,
  buildTokoSkuKey,
  buildImeiKey,
  isApproved,
  isRefund,
  isPenjualan,
  isPembelian,
  isTransferMasuk,
  isTransferKeluar,
  isReject,
  isStockOpname,
  isImeiItem,
  isNonImeiItem,
  sortTransaction,
  toNumber,
} from "./helpers";

/**
 * ==========================================================
 * Build Enterprise Transaction Summary
 * ==========================================================
 *
 * @param {Object} options
 * @param {Array} options.transaksi
 * @param {Object} options.supplierLookup
 * @param {Object} options.masterMap
 *
 * @returns {Object}
 *
 */
export function buildTransaksiSummary({
  transaksi = [],

  supplierLookup = {},

  masterMap = {},
}) {
  // ======================================================
  // SORT
  // ======================================================
  // Pastikan transaksi diproses dari paling lama
  // menuju paling baru.
  // Hal ini penting supaya perpindahan owner IMEI
  // maupun refund dapat ditelusuri secara benar.
  // ======================================================

  const sortedTransaksi = [...transaksi].sort(sortTransaction);

  // ======================================================
  // HASIL AKHIR
  // ======================================================

  const activeImeiSet = new Set();

  const imeiTerjual = new Set();

  const refundAvailableSet = new Set();

  const refundSoldSet = new Set();

  const masterPembelianActiveMap = {};

  const finalOwnerTracker = {};

  const refundFinalTracker = {};

  const imeiTransferTracker = {};

  const imeiFinalMap = {};

  // ======================================================
  // OPTIONAL CACHE
  // ======================================================

  const skuCache = {};

  const tokoSkuCache = {};

  const imeiCache = {};

  // ======================================================
  // SINGLE PASS ENGINE
  // ======================================================
  //
  // Semua transaksi diproses SATU KALI.
  //
  // Jangan lagi membuat:
  //
  // transaksi.forEach(...)
  // transaksi.filter(...)
  // transaksi.reduce(...)
  //
  // pada Dashboard.
  //
  // Semua logika berada di sini.
  //
  // ======================================================

  for (const trx of sortedTransaksi) {
    if (!trx) continue;

    //----------------------------------------------------
    // NORMALISASI DATA
    //----------------------------------------------------

    const toko = normalize(trx.TOKO);

    const supplier = normalize(trx.SUPPLIER ?? supplierLookup[trx.NO_DO] ?? "");

    const brand = normalizeText(trx.BRAND || trx.MERK);

    const barang = normalizeText(trx.NAMA_BARANG || trx.BARANG);

    const imei = normalizeImei(trx.IMEI);

    const qty = toNumber(trx.QTY || trx.JUMLAH || 1);

    const skuKey = buildSkuKey(brand, barang);

    const tokoSkuKey = buildTokoSkuKey(toko, brand, barang);

    const imeiKey = buildImeiKey(imei);

    //----------------------------------------------------
    // CACHE
    //----------------------------------------------------

    skuCache[skuKey] = true;
    tokoSkuCache[tokoSkuKey] = true;

    if (imeiKey) {
      imeiCache[imeiKey] = true;
    }
    //----------------------------------------------------
    // VALIDASI
    //----------------------------------------------------

    //======================================================
    // ACTIVE IMEI
    //======================================================

    if (imeiKey && isImeiItem(trx)) {
      if (isPembelian(trx)) {
        activeImeiSet.add(imeiKey);
      }
    }

    //======================================================
    // IMEI TERJUAL
    //======================================================

    if (imeiKey && isImeiItem(trx)) {
      if (isPenjualan(trx)) {
        imeiTerjual.add(imeiKey);
      }

      if (isRefund(trx)) {
        imeiTerjual.delete(imeiKey);
      }
    }

    //======================================================
    // REFUND AVAILABLE ENGINE
    //======================================================
    //
    // IMEI yang kembali aktif karena REFUND.
    //
    // REFUND
    //      -> add()
    //
    // PENJUALAN
    //      -> delete()
    //
    // TRANSFER_KELUAR
    // REJECT
    // STOK OPNAME
    //      -> delete()
    //
    //======================================================

    if (imeiKey && isImeiItem(trx)) {
      //--------------------------------------------------
      // REFUND MASUK STOCK
      //--------------------------------------------------

      if (isRefund(trx)) {
        refundAvailableSet.add(imeiKey);
      }

      //--------------------------------------------------
      // SUDAH TERJUAL LAGI
      //--------------------------------------------------

      if (isPenjualan(trx)) {
        refundAvailableSet.delete(imeiKey);
      }

      //--------------------------------------------------
      // STOCK KELUAR
      //--------------------------------------------------

      if (isTransferKeluar(trx) || isReject(trx) || isStockOpname(trx)) {
        refundAvailableSet.delete(imeiKey);
      }
    }

    //----------------------------------------------------
    // ===================================================
    // BAGIAN 2
    // ===================================================
    //
    // Di sinilah nanti akan dipindahkan seluruh
    // logika:
    //
    // activeImeiSet
    // imeiTerjual
    // refundAvailableSet
    // refundSoldSet
    // masterPembelianActiveMap
    // finalOwnerTracker
    // refundFinalTracker
    // imeiTransferTracker
    // imeiFinalMap
    //
    // Seluruh kode dari Dashboard akan dipindahkan
    // TANPA mengubah algoritma bisnis.
    //
    // ===================================================
  }

  // ======================================================
  // RETURN
  // ======================================================

  return {

    // ==========================
    // IMEI
    // ==========================

    activeImeiSet,

    imeiTerjual,

    refundAvailableSet,

    refundSoldSet,

    // ==========================
    // STOCK ENGINE
    // ==========================

    masterPembelianActiveMap,

    finalOwnerTracker,

    refundFinalTracker,

    imeiTransferTracker,

    imeiFinalMap,

    // ==========================
    // DEBUG
    // ==========================

    sortedTransaksi,

    skuCache,

    tokoSkuCache,

    imeiCache,

    supplierLookup,

    masterMap

};
}
