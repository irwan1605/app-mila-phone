import * as XLSX from "xlsx";

import {
  addMasterBarang,
  updateMasterBarang,
} from "../../../services/FirebaseService";

// ======================================
// NORMALIZE
// ======================================
const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

// ======================================
// PROCESS IMPORT
// ======================================
export const processImportMasterMotor = async ({
    file,
  
    kategori = "",
  
    existingBarang = [],
  }) => {
  try {
    // ======================================
    // READ FILE
    // ======================================
    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type: "array",
    });

    const sheetName = workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      throw new Error("File excel kosong");
    }

    // ======================================
    // TRACKER DUPLIKAT
    // ======================================
    const tracker = new Set();

    // ======================================
    // LOOP
    // ======================================
    for (const row of rows) {
      const brand = String(row["Brand"] || "").trim();

      const namaBarang = String(row["Nama Barang"] || "").trim();

      const hargaSRP = Number(row["Harga SRP"] || 0);

      const hargaGrosir = Number(row["Harga Grosir"] || 0);

      const hargaReseller = Number(row["Harga Reseller"] || 0);

      // ======================================
      // VALIDASI
      // ======================================
      if (!brand) {
        throw new Error("Brand wajib diisi");
      }

      if (!namaBarang) {
        throw new Error("Nama Barang wajib diisi");
      }

      if (!hargaSRP || hargaSRP <= 0) {
        throw new Error(`Harga SRP tidak valid : ${namaBarang}`);
      }

      // ======================================
      // KEY
      // ======================================
      const key = `${normalize(brand)}|${normalize(namaBarang)}`;

      // ======================================
      // DUPLIKAT EXCEL
      // ======================================
      if (tracker.has(key)) {
        throw new Error(
          `❌ DUPLIKAT DATA DI FILE EXCEL\n\n${brand} - ${namaBarang}`
        );
      }

      tracker.add(key);

      // ======================================
      // CEK EXISTING
      // ======================================
      const exist = existingBarang.find(
        (b) =>
          normalize(b.brand) === normalize(brand) &&
          normalize(b.namaBarang) === normalize(namaBarang) &&
          normalize(
            b.kategoriBarang
          ) ===
          normalize(kategori)
      );

      const payload = {
        kategoriBarang:
        normalize(kategori),

        brand,

        namaBarang,

        harga: {
          srp: hargaSRP,

          grosir: hargaGrosir,

          reseller: hargaReseller,
        },

        hargaSRP,

        hargaGrosir,

        hargaReseller,

        UPDATED_AT: Date.now(),
      };

      // ======================================
      // UPDATE
      // ======================================
      if (exist?.id) {
        await updateMasterBarang(exist.id, payload);
      }

      // ======================================
      // ADD BARU
      // ======================================
      else {
        await addMasterBarang({
          ...payload,

          CREATED_AT: Date.now(),
        });
      }
    }

    return {
      success: true,

    message:
`✅ IMPORT MASTER ${kategori} BERHASIL`
    };
  } catch (err) {
    console.error(err);

    return {
      success: false,

      message: err?.message || "❌ Gagal import master motor",
    };
  }
};
