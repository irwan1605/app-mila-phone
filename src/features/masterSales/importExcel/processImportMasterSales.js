import * as XLSX from "xlsx";

import {
  addMasterSales,
  updateMasterSales,
} from "../../../services/FirebaseService";

// ======================================
// NORMALIZE
// ======================================
const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

// ======================================
// PROCESS IMPORT MASTER SALES
// ======================================
export const processImportMasterSales = async ({
  file,

  existingSales = [],

  masterToko = [],
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

    // ======================================
    // VALIDASI FILE
    // ======================================
    if (!rows.length) {
      throw new Error("File excel kosong");
    }

    // ======================================
    // TRACKER DUPLIKAT EXCEL
    // ======================================
    const tracker = new Set();

    // ======================================
    // LOOP IMPORT
    // ======================================
    for (const row of rows) {
      const namaSales = String(row["Nama Sales"] || "").trim();

      const namaToko = String(row["Nama Toko"] || "").trim();

      const nik = String(row["NIK"] || "").trim();

      const noTelpon = String(row["No. Telpon"] || "").trim();

      const alamat = String(row["Alamat"] || "").trim();

      // ======================================
      // VALIDASI
      // ======================================
      if (!namaSales) {
        throw new Error("Nama Sales wajib diisi");
      }

      if (!namaToko) {
        throw new Error("Nama Toko wajib diisi");
      }

      // ======================================
      // VALIDASI TOKO
      // ======================================
      const tokoExist = masterToko.some(
        (t) => normalize(t.nama) === normalize(namaToko)
      );

      if (!tokoExist) {
        throw new Error(`❌ TOKO TIDAK DITEMUKAN\n\n${namaToko}`);
      }

      // ======================================
      // KEY DUPLIKAT
      // ======================================
      const key = `${normalize(namaSales)}|${normalize(namaToko)}`;

      // ======================================
      // DUPLIKAT EXCEL
      // ======================================
      if (tracker.has(key)) {
        throw new Error(
          `❌ DUPLIKAT SALES DI FILE EXCEL\n\n${namaSales} - ${namaToko}`
        );
      }

      tracker.add(key);

      // ======================================
      // DUPLIKAT NIK
      // ======================================
      if (nik) {
        const nikExist = existingSales.find(
          (s) => normalize(s.nik) === normalize(nik)
        );

        if (
          nikExist &&
          normalize(nikExist.namaSales) !== normalize(namaSales)
        ) {
          throw new Error(`❌ NIK SUDAH DIGUNAKAN\n\nNIK: ${nik}`);
        }
      }

      // ======================================
      // CEK EXISTING SALES
      // ======================================
      const exist = existingSales.find(
        (s) =>
          normalize(s.namaSales) === normalize(namaSales) &&
          normalize(s.namaToko) === normalize(namaToko)
      );

      // ======================================
      // PAYLOAD
      // ======================================
      const payload = {
        namaSales,

        namaToko,

        nik,

        noTelpon,

        alamat,

        UPDATED_AT: Date.now(),
      };

      // ======================================
      // UPDATE
      // ======================================
      if (exist?.id) {
        await updateMasterSales(exist.id, payload);
      }

      // ======================================
      // ADD BARU
      // ======================================
      else {
        await addMasterSales({
          ...payload,

          CREATED_AT: Date.now(),
        });
      }
    }

    return {
      success: true,

      message: "✅ IMPORT MASTER SALES BERHASIL",
    };
  } catch (err) {
    console.error(err);

    return {
      success: false,

      message: err?.message || "❌ Gagal import sales",
    };
  }
};
