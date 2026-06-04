import * as XLSX from "xlsx";

import { STOCK_EXPORT_COLUMNS, STOCK_EXPORT_WIDTHS } from "./stockExcelColumns";

// ======================================
// 🔥 UNIVERSAL EXPORT STOCK
// ======================================

export const exportStockExcel = ({
  rows = [],
  namaToko = "",
  fileName = "STOCK",
}) => {
  try {
    // ======================================
    // 🔥 FORMAT FINAL
    // ======================================
    // ======================================
    // 🔥 FILTER EXPORT ONLY
    // HILANGKAN BARANG SUDAH KELUAR
    // TANPA MENGUBAH TAMPILAN TABLE
    // ======================================

    const finalRows = (rows || []).filter((r) => {
      const statusBarang = String(r.statusBarang || "").toUpperCase();

      const keterangan = String(r.keterangan || "").toUpperCase();

      const qty = Number(r.qty || 0);

      // stok habis
      if (qty <= 0) {
        return false;
      }

      // sudah terjual
      if (statusBarang.includes("TERJUAL")) {
        return false;
      }

      // reject
      if (keterangan.includes("REJECT")) {
        return false;
      }

      // opname keluar
      if (keterangan.includes("STOK OPNAME")) {
        return false;
      }

      return true;
    });

    const exportRows = finalRows.map((r, i) => ({
      NO: i + 1,

      TANGGAL: r.tanggal || "-",

      "NO DO": r.noDo || "-",

      SUPPLIER: r.supplier || "-",

      TOKO:
        r.toko ||
        r.namaToko ||
        r.NAMA_TOKO ||
        r.tokoLogin ||
        r.nama_toko ||
        "-",

      BRAND: r.brand || "-",

      BARANG: r.barang || "-",

      IMEI: r.imei || "NON IMEI",

      QTY: Number(r.qty || 0),

      "HARGA SRP": Number(r.hargaSRP || 0),

      "HARGA GROSIR": Number(r.hargaGrosir || 0),

      "HARGA RESELLER": Number(r.hargaReseller || 0),

      STATUS: r.statusBarang || "-",

      KETERANGAN: r.keterangan || "-",
    }));

    // ======================================
    // 🔥 SHEET
    // ======================================
    const ws = XLSX.utils.json_to_sheet(exportRows, {
      header: STOCK_EXPORT_COLUMNS,
    });

    // ======================================
    // 🔥 WIDTH
    // ======================================
    ws["!cols"] = STOCK_EXPORT_WIDTHS;

    // ======================================
    // 🔥 WORKBOOK
    // ======================================
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "DETAIL_STOCK");

    // ======================================
    // 🔥 EXPORT
    // ======================================
    XLSX.writeFile(
      wb,
      `${fileName}_${namaToko}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );

    console.log("✅ EXPORT SUCCESS:", exportRows.length);

    return true;
  } catch (err) {
    console.error("❌ EXPORT ERROR:", err);

    return false;
  }
};
