// ======================================
// NORMALIZE TEXT
// ======================================
const normalizeText = (txt) =>
  String(txt || "")
    .trim()
    .toUpperCase();

// ======================================
// KATEGORI WAJIB IMEI
// ======================================
const KATEGORI_IMEI = ["HANDPHONE", "SEPEDA LISTRIK", "MOTOR LISTRIK"];

// ======================================
// CEK APAKAH PEMBELIAN SUDAH TERJUAL
// ======================================
export const isPembelianSold = (pembelian, allTransaksi = []) => {
  // ======================================
  // VALIDASI PEMBELIAN
  // ======================================
  if (normalizeText(pembelian?.PAYMENT_METODE) !== "PEMBELIAN") {
    return false;
  }

  const kategori = normalizeText(pembelian?.KATEGORI_BRAND);

  const isImei = KATEGORI_IMEI.includes(kategori);

  // ======================================
  // ======================================
  // IMEI
  // ======================================
  // ======================================
  if (isImei) {
    const imei = String(pembelian?.IMEI || "").trim();

    if (!imei) return false;

    // ======================================
    // CEK ADA PENJUALAN
    // ======================================
    const soldRows = allTransaksi.filter(
      (trx) =>
        normalizeText(trx?.PAYMENT_METODE) === "PENJUALAN" &&
        String(trx?.IMEI || "").trim() === imei
    );

    // ======================================
    // BELUM ADA PENJUALAN
    // ======================================
    if (!soldRows.length) {
      return false;
    }

    // ======================================
    // CEK ADA REFUND
    // ======================================
    const refundRows = allTransaksi.filter(
      (trx) =>
        normalizeText(trx?.PAYMENT_METODE) === "REFUND" &&
        String(trx?.IMEI || "").trim() === imei
    );

    // ======================================
    // ADA REFUND
    // ======================================
    if (refundRows.length > 0) {
      return false;
    }

    // ======================================
    // FIX TERJUAL
    // ======================================
    return true;
  }

  // ======================================
  // ======================================
  // NON IMEI
  // ======================================
  // ======================================
  const namaBarang = normalizeText(pembelian?.NAMA_BARANG);

  const namaToko = normalizeText(pembelian?.NAMA_TOKO);

  const brand = normalizeText(pembelian?.NAMA_BRAND);

  const qtyPembelian = Number(pembelian?.QTY || 0);

  // ======================================
  // TOTAL PENJUALAN
  // ======================================
  const totalJual = allTransaksi
    .filter(
      (trx) =>
        normalizeText(trx?.PAYMENT_METODE) === "PENJUALAN" &&
        normalizeText(trx?.NAMA_BARANG) === namaBarang &&
        normalizeText(trx?.NAMA_TOKO) === namaToko &&
        normalizeText(trx?.NAMA_BRAND) === brand
    )
    .reduce((sum, trx) => sum + Number(trx?.QTY || 0), 0);

  // ======================================
  // TOTAL REFUND
  // ======================================
  const totalRefund = allTransaksi
    .filter(
      (trx) =>
        normalizeText(trx?.PAYMENT_METODE) === "REFUND" &&
        normalizeText(trx?.NAMA_BARANG) === namaBarang &&
        normalizeText(trx?.NAMA_TOKO) === namaToko &&
        normalizeText(trx?.NAMA_BRAND) === brand
    )
    .reduce((sum, trx) => sum + Number(trx?.QTY || 0), 0);

  // ======================================
  // SISA QTY
  // ======================================
  const qtySisa = qtyPembelian - totalJual + totalRefund;

  // ======================================
  // HABIS TERJUAL
  // ======================================
  return qtySisa <= 0;
};

// ======================================
// BUILD PEMBELIAN REALTIME
// ======================================
export const buildPembelianRealtime = (allTransaksi = []) => {
  // ======================================
  // FILTER KHUSUS PEMBELIAN
  // ======================================
  const pembelianRows = allTransaksi.filter(
    (trx) => normalizeText(trx?.PAYMENT_METODE) === "PEMBELIAN"
  );

  // ======================================
  // AUTO HIDE SUDAH TERJUAL
  // ======================================
  const visibleRows = pembelianRows.filter(
    (row) => !isPembelianSold(row, allTransaksi)
  );

  // ======================================
  // SORT TERBARU
  // ======================================
  visibleRows.sort(
    (a, b) =>
      Number(b?.UPDATED_AT || b?.CREATED_AT || 0) -
      Number(a?.UPDATED_AT || a?.CREATED_AT || 0)
  );

  return visibleRows;
};
