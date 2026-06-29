//src/features/pembelian/utils/pembelianRealtime.js//

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
// BUILD KEY NON IMEI
// ======================================
const buildNonImeiKey = (trx) => {
  return [
    normalizeText(trx?.NAMA_TOKO),
    normalizeText(trx?.NAMA_BRAND),
    normalizeText(trx?.NAMA_BARANG),
  ].join("|");
};

// ======================================
// BUILD PEMBELIAN REALTIME FINAL
// ======================================
export const buildPembelianRealtime = (allTransaksi = []) => {
  // ======================================
  // FILTER VALID
  // ======================================
  const validRows = (allTransaksi || []).filter(
    (t) => t && t.id && normalizeText(t.STATUS) !== "VOID"
  );

  // ======================================
  // STOCK IMEI AKTIF
  // ======================================
  const activeImeiMap = new Set();

  // ======================================
  // STOCK NON IMEI
  // ======================================
  const nonImeiStockMap = {};

  // ======================================
  // SORT BERDASARKAN WAKTU
  // ======================================
  const sortedRows = [...validRows].sort((a, b) => {
    const timeA =
        Number(a.CREATED_AT) ||
        new Date(a.TANGGAL_TRANSAKSI || 0).getTime();

    const timeB =
        Number(b.CREATED_AT) ||
        new Date(b.TANGGAL_TRANSAKSI || 0).getTime();

    return timeA - timeB;
});

  // ======================================
  // BUILD STOCK REALTIME
  // ======================================
  sortedRows.forEach((trx) => {
    const metode = normalizeText(trx?.PAYMENT_METODE);

    const kategori = normalizeText(trx?.KATEGORI_BRAND);

    const isImei = KATEGORI_IMEI.includes(kategori);

    // ======================================
    // IMEI
    // ======================================
    if (isImei) {
      const imei = String(trx?.IMEI || "").trim();

      // ======================================
      // IMEI KOSONG
      // ======================================
      if (!imei) {
        return;
      }

      // ======================================
      // SUDAH TERJUAL
      // ======================================
      const isActive = activeImeiMap.has(imei);

      // ======================================
      // HILANGKAN DARI TABLE
      // ======================================
      if (!isActive) {
        return;
      }

      // ======================================
      // TAMPILKAN YANG MASIH READY
      // ======================================
      visibleRows.push({
        ...trx,

        // ======================================
        // FIX REALTIME QTY
        // ======================================
        REAL_QTY: 1,

        QTY: 1,

        STOCK_READY: true,
      });

      return;
    }

    // ======================================
    // ======================================
    // NON IMEI
    // ======================================
    // ======================================
    const key = buildNonImeiKey(trx);

    if (!nonImeiStockMap[key]) {
      nonImeiStockMap[key] = 0;
    }

    const qty = Number(trx?.QTY || 0);

    // ======================================
    // PEMBELIAN
    // ======================================
    if (metode === "PEMBELIAN") {
      nonImeiStockMap[key] += qty;
    }

    // ======================================
    // PENJUALAN
    // ======================================
    if (metode === "PENJUALAN") {
      nonImeiStockMap[key] -= qty;
    }

    // ======================================
    // REFUND
    // ======================================
    if (metode === "REFUND") {
      nonImeiStockMap[key] += qty;
    }
  });

  // ======================================
// BUILD ACTIVE IMEI
// ======================================
sortedRows.forEach((trx) => {
  const kategori = normalizeText(trx.KATEGORI_BRAND);

  if (!KATEGORI_IMEI.includes(kategori)) return;

  const imei = String(trx.IMEI || "").trim();

  if (!imei) return;

  const metode = normalizeText(trx.PAYMENT_METODE);

  switch (metode) {
    case "PEMBELIAN":
    case "REFUND":
    case "TRANSFER_MASUK":
      activeImeiMap.add(imei);
      break;

    case "PENJUALAN":
    case "TRANSFER_KELUAR":
      activeImeiMap.delete(imei);
      break;

    default:
      break;
  }
});

  // ======================================
  // FILTER PEMBELIAN YANG MASIH AKTIF
  // ======================================
  const pembelianRows = sortedRows.filter(
    (trx) => normalizeText(trx?.PAYMENT_METODE) === "PEMBELIAN"
  );

  // ======================================
  // FINAL VISIBLE ROWS
  // ======================================
  const visibleRows = [];

  pembelianRows.forEach((trx) => {
    const kategori = normalizeText(trx?.KATEGORI_BRAND);

    const isImei = KATEGORI_IMEI.includes(kategori);

    // ======================================
    // IMEI
    // ======================================
    if (isImei) {
      const imei = String(trx?.IMEI || "").trim();

      if (!imei) {
        return;
      }

      // ======================================
      // MASIH AKTIF
      // ======================================
      if (activeImeiMap.has(imei)) {
        visibleRows.push({
          ...trx,

          // ======================================
          // REAL QTY
          // ======================================
          REAL_QTY: 1,
        });
      }

      return;
    }

    // ======================================
    // NON IMEI
    // ======================================
    const key = buildNonImeiKey(trx);

    const sisaStock = Number(nonImeiStockMap[key] || 0);

    // ======================================
    // STOCK HABIS
    // ======================================
    if (sisaStock <= 0) {
      return;
    }

    // ======================================
    // AMBIL QTY ASLI PEMBELIAN
    // ======================================
    const originalQty = Number(trx?.QTY || 0);

    // ======================================
    // JIKA STOCK TERSISA
    // ======================================
    const finalQty = Math.min(originalQty, sisaStock);

    visibleRows.push({
      ...trx,

      // ======================================
      // REAL QTY
      // ======================================
      REAL_QTY: finalQty,

      // ======================================
      // OVERRIDE QTY TABLE
      // ======================================
      QTY: finalQty,
    });

    // ======================================
    // KURANGI SISA STOCK
    // ======================================
    nonImeiStockMap[key] -= finalQty;
  });

  // ======================================
  // SORT TERBARU
  // ======================================
  visibleRows.sort(
    (a, b) =>
      Number(b.UPDATED_AT || b.CREATED_AT || 0) -
      Number(a.UPDATED_AT || a.CREATED_AT || 0)
  );

  return visibleRows;
};
