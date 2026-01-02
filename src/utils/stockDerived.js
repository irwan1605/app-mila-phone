// src/utils/stockDerived.js

/**
 * SINGLE SOURCE OF TRUTH STOCK DERIVATION
 * --------------------------------------
 * Menghitung stok FINAL per Toko + per SKU
 * berdasarkan transaksi APPROVED.
 *
 * Digunakan oleh:
 * - InventoryReport.jsx
 * - DetailStockToko.jsx
 * - StockOpname.jsx
 *
 * Output:
 * {
 *   "CIBINONG": {
 *     "IMEI123": { toko, key, brand, barang, qty },
 *     "SAMSUNG|A15": { ... }
 *   }
 * }
 */

export function deriveStockFromTransaksi(transaksi = []) {
    const map = {};
  
    transaksi.forEach((t) => {
      if (!t) return;
      if (t.STATUS !== "Approved") return;
  
      const toko = t.NAMA_TOKO || "CILANGKAP PUSAT";
  
      const key =
        (t.NOMOR_UNIK && String(t.NOMOR_UNIK).trim()) ||
        `${String(t.NAMA_BRAND || "").trim()}|${String(
          t.NAMA_BARANG || ""
        ).trim()}`;
  
      if (!key) return;
  
      const qty = t.IMEI ? 1 : Number(t.QTY || 0);
  
      const isMasuk = ["PEMBELIAN", "TRANSFER_MASUK", "STOK OPNAME"].includes(
        t.PAYMENT_METODE
      );
  
      const isKeluar = ["PENJUALAN", "TRANSFER_KELUAR"].includes(
        t.PAYMENT_METODE
      );
  
      if (!map[toko]) map[toko] = {};
  
      if (!map[toko][key]) {
        map[toko][key] = {
          toko,
          key,
          brand: t.NAMA_BRAND || "",
          barang: t.NAMA_BARANG || "",
          qty: 0,
        };
      }
  
      if (isMasuk) map[toko][key].qty += qty;
      if (isKeluar) map[toko][key].qty -= qty;
    });
  
    return map;
  }
  