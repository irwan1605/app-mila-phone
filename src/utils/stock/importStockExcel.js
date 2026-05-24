import * as XLSX from "xlsx";

// ======================================
// 🔥 IMPORT EXCEL STOCK
// ======================================

export const importStockExcel = async (file) => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();

      reader.onload = (e) => {
        const data = e.target.result;

        const workbook = XLSX.read(data, {
          type: "binary",
        });

        const sheetName = workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // ======================================
        // 🔥 NORMALIZE IMPORT
        // ======================================
        const rows = jsonData.map((r) => ({
          tanggal: r["TANGGAL"] || "-",

          noDo: r["NO DO"] || "-",

          supplier: r["SUPPLIER"] || "-",

          namaToko: r["TOKO"] || "-",

          brand: r["BRAND"] || "-",

          barang: r["BARANG"] || "-",

          imei:
            r["IMEI"] === "NON IMEI"
              ? ""
              : String(r["IMEI"] || "").trim(),

          qty: Number(r["QTY"] || 0),

          hargaSRP: Number(r["HARGA SRP"] || 0),

          hargaGrosir: Number(r["HARGA GROSIR"] || 0),

          hargaReseller: Number(r["HARGA RESELLER"] || 0),

          statusBarang: r["STATUS"] || "-",

          keterangan: r["KETERANGAN"] || "-",
        }));

        console.log("✅ IMPORT SUCCESS:", rows.length);

        resolve(rows);
      };

      reader.readAsBinaryString(file);
    } catch (err) {
      console.error("❌ IMPORT ERROR:", err);

      reject(err);
    }
  });
};