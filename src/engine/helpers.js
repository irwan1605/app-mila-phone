// ==========================================================
// src/engine/helpers.js
// Enterprise Helper Function
// PT Mila Media Telekomunikasi
// ==========================================================

// ===========================================
// FORMAT ANGKA
// ===========================================
export function fmt(value = 0) {
  try {
    return Number(value || 0).toLocaleString("id-ID");
  } catch {
    return String(value || "");
  }
}

// ===========================================
// FORMAT RUPIAH
// ===========================================
export function rupiah(value = 0) {
  return Number(value || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });
}

// ===========================================
// NORMALIZE STRING
// ===========================================
export function normalize(value = "") {
  return String(value).trim().toUpperCase();
}

// ===========================================
// NORMALIZE TEXT
// (Menghapus spasi ganda)
// ===========================================
export function normalizeText(value = "") {
  return String(value).trim().toUpperCase().replace(/\s+/g, " ");
}

// ===========================================
// NORMALIZE IMEI
// ===========================================
export function normalizeImei(imei = "") {
  return String(imei).trim().toUpperCase().replace(/\s+/g, "");
}

// ===========================================
// STATUS APPROVED
// ===========================================
export function isApproved(trx = {}) {
  return String(trx.STATUS || "").toUpperCase() === "APPROVED";
}

// ===========================================
// STATUS REFUND
// ===========================================
export function isRefund(trx = {}) {
  return String(trx.PAYMENT_METODE || "").toUpperCase() === "REFUND";
}

// ===========================================
// STATUS PENJUALAN
// ===========================================
export function isPenjualan(trx = {}) {
  return String(trx.PAYMENT_METODE || "").toUpperCase() === "PENJUALAN";
}

// ===========================================
// STATUS PEMBELIAN
// ===========================================
export function isPembelian(trx = {}) {
  return String(trx.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN";
}

// ===========================================
// STATUS TRANSFER MASUK
// ===========================================
export function isTransferMasuk(trx = {}) {
  return String(trx.PAYMENT_METODE || "").toUpperCase() === "TRANSFER_MASUK";
}

// ===========================================
// STATUS TRANSFER KELUAR
// ===========================================
export function isTransferKeluar(trx = {}) {
  return String(trx.PAYMENT_METODE || "").toUpperCase() === "TRANSFER_KELUAR";
}

// ===========================================
// STATUS REJECT
// ===========================================
export function isReject(trx = {}) {
  return String(trx.PAYMENT_METODE || "").toUpperCase() === "REJECT";
}

// ===========================================
// STATUS STOCK OPNAME
// ===========================================
export function isStockOpname(trx = {}) {
  return String(trx.PAYMENT_METODE || "").toUpperCase() === "STOK OPNAME";
}

// ===========================================
// CEK IMEI ATAU NON IMEI
// ===========================================
export function isImeiItem(trx = {}) {
  const imei = normalizeImei(trx.IMEI);

  return imei && imei !== "NONIMEI" && imei !== "NON-IMEI";
}

// ===========================================
// CEK NON IMEI
// ===========================================
export function isNonImeiItem(trx = {}) {
  return !isImeiItem(trx);
}

// ===========================================
// SORT TRANSAKSI
// Terlama → Terbaru
// ===========================================
export function sortTransaction(a, b) {
  return (
    new Date(a.CREATED_AT || a.TANGGAL_TRANSAKSI || 0).getTime() -
    new Date(b.CREATED_AT || b.TANGGAL_TRANSAKSI || 0).getTime()
  );
}

// ===========================================
// BUILD SKU KEY
// ===========================================
export function buildSkuKey(brand = "", barang = "") {
  return `${normalizeText(brand)}|${normalizeText(barang)}`;
}

// ===========================================
// BUILD SKU TOKO
// ===========================================
export function buildTokoSkuKey(toko = "", brand = "", barang = "") {
  return `${normalize(toko)}|${normalizeText(brand)}|${normalizeText(barang)}`;
}

// ===========================================
// BUILD IMEI KEY
// ===========================================
export function buildImeiKey(imei = "") {
  return normalizeImei(imei);
}

// ===========================================
// SAFE NUMBER
// ===========================================
export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// ===========================================
// SAFE STRING
// ===========================================
export function toString(value) {
  return String(value || "").trim();
}

// ===========================================
// SAFE DATE
// ===========================================
export function toDate(value) {
  const d = new Date(value || 0);

  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}
