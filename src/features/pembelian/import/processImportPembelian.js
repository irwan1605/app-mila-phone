import * as XLSX from "xlsx";

import { addTransaksi, addStock } from "../../../services/FirebaseService";

// ======================================
// KATEGORI WAJIB IMEI
// ======================================
const KATEGORI_WAJIB_IMEI = ["SEPEDA LISTRIK", "MOTOR LISTRIK", "HANDPHONE"];

// ======================================
// SKU
// ======================================
const makeSku = (brand, barang) =>
  `${(brand || "").trim()}_${(barang || "").trim()}`.replace(/\s+/g, "_");

// ======================================
// PROCESS IMPORT PEMBELIAN
// ======================================
export const processImportPembelian = async ({
  file,

  masterBarang = [],

  masterToko = [],

  allTransaksi = [],
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
    // TRACKER IMEI EXISTING PEMBELIAN
    // ======================================
    const existingImeis = new Set(
      allTransaksi
        .filter(
          (x) => String(x.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN"
        )
        .map((x) =>
          String(x.IMEI || "")
            .trim()
            .toUpperCase()
        )
        .filter(Boolean)
    );

    // ======================================
    // TRACKER IMEI IMPORT EXCEL
    // ======================================
    const importImeis = new Set();

    // ======================================
    // LOOP IMPORT
    // ======================================
    for (const row of rows) {
      const tanggal = String(row["Tanggal"] || "").trim();

      const noDo = String(row["No Delivery Order"] || "").trim();

      const supplier = String(row["Supplier"] || "").trim();

      const namaToko = String(row["Nama Toko"] || "").trim();

      const brand = String(row["Nama Brand"] || "").trim();

      const kategoriBrand = String(row["Kategori Brand"] || "").trim();

      const barang = String(row["Nama Barang"] || "").trim();

      const imei = String(row["No IMEI"] || "").trim();

      const qty = Number(row["Qty"] || 0);

      const hargaSup = Number(row["Harga Supplier (Satuan)"] || 0);

      // ======================================
      // VALIDASI
      // ======================================
      if (!tanggal) {
        throw new Error("Tanggal wajib diisi");
      }

      if (!noDo) {
        throw new Error("No DO wajib diisi");
      }

      if (!supplier) {
        throw new Error("Supplier wajib diisi");
      }

      if (!namaToko) {
        throw new Error("Nama Toko wajib diisi");
      }

      if (!brand) {
        throw new Error("Brand wajib diisi");
      }

      if (!barang) {
        throw new Error("Barang wajib diisi");
      }

      // ======================================
      // VALIDASI MASTER TOKO
      // ======================================
      const tokoObj = masterToko.find(
        (t) =>
          String(t.nama || "")
            .trim()
            .toUpperCase() === namaToko.toUpperCase()
      );

      if (!tokoObj) {
        throw new Error(`Toko tidak ditemukan: ${namaToko}`);
      }

      const tokoId = tokoObj.id;

      // ======================================
      // VALIDASI MASTER BARANG
      // ======================================
      const barangExist = masterBarang.some(
        (b) =>
          String(b.brand || "")
            .trim()
            .toUpperCase() === brand.toUpperCase() &&
          String(b.namaBarang || "")
            .trim()
            .toUpperCase() === barang.toUpperCase()
      );

      if (!barangExist) {
        throw new Error(
          `Barang tidak ditemukan di MASTER BARANG:\n${brand} - ${barang}`
        );
      }

      // ======================================
      // SKU
      // ======================================
      const sku = makeSku(brand, barang);

      // ======================================
      // KATEGORI IMEI
      // ======================================
      const isKategoriImei = KATEGORI_WAJIB_IMEI.includes(kategoriBrand);

      // ======================================
      // IMEI
      // ======================================
      if (isKategoriImei) {
        if (!imei) {
          throw new Error(`IMEI wajib diisi untuk ${barang}`);
        }

        // ======================================
        // IMEI
        // ======================================
        if (isKategoriImei) {
          // ======================================
          // VALIDASI IMEI KOSONG
          // ======================================
          if (!imei) {
            throw new Error(`IMEI wajib diisi untuk ${barang}`);
          }

          // ======================================
          // CLEAN IMEI
          // ======================================
          const cleanImei = String(imei).trim().toUpperCase();

          // ======================================
          // CEK IMEI SUDAH ADA
          // ======================================
          if (existingImeis.has(cleanImei)) {
            throw new Error(
              `❌ IMEI SUDAH ADA DI DATA PEMBELIAN\n\nIMEI: ${cleanImei}`
            );
          }

          // ======================================
          // CEK DUPLIKAT DI EXCEL
          // ======================================
          if (importImeis.has(cleanImei)) {
            throw new Error(
              `❌ DUPLIKAT IMEI DI FILE EXCEL\n\nIMEI: ${cleanImei}`
            );
          }

          // ======================================
          // SIMPAN TRACKER
          // ======================================
          importImeis.add(cleanImei);

          // ======================================
          // INSERT PEMBELIAN
          // ======================================
          await addTransaksi(tokoId, {
            TANGGAL_TRANSAKSI: tanggal,

            NO_INVOICE: noDo,

            NAMA_SUPPLIER: supplier,

            NAMA_USER: "IMPORT EXCEL",

            NAMA_TOKO: namaToko,

            NAMA_BRAND: brand,

            KATEGORI_BRAND: kategoriBrand,

            NAMA_BARANG: barang,

            IMEI: cleanImei,

            QTY: 1,

            HARGA_SUPLAYER: hargaSup,

            HARGA_UNIT: hargaSup,

            TOTAL: hargaSup,

            PAYMENT_METODE: "PEMBELIAN",

            STATUS: "Approved",

            CREATED_AT: Date.now(),
          });

          // ======================================
          // AUTO STOCK
          // ======================================
          await addStock(namaToko, sku, {
            brand,
            barang,
            qty: 1,
          });
        }

        // ======================================
        // AUTO STOCK
        // ======================================
        await addStock(namaToko, sku, {
          brand,
          barang,
          qty: 1,
        });
      }

      // ======================================
      // NON IMEI
      // ======================================
      else {
        if (!qty || qty <= 0) {
          throw new Error(`Qty tidak valid untuk ${barang}`);
        }

        await addTransaksi(tokoId, {
          TANGGAL_TRANSAKSI: tanggal,

          NO_INVOICE: noDo,

          NAMA_SUPPLIER: supplier,

          NAMA_USER: "IMPORT EXCEL",

          NAMA_TOKO: namaToko,

          NAMA_BRAND: brand,

          KATEGORI_BRAND: kategoriBrand,

          NAMA_BARANG: barang,

          IMEI: "",

          QTY: qty,

          HARGA_SUPLAYER: hargaSup,

          HARGA_UNIT: hargaSup,

          TOTAL: hargaSup * qty,

          PAYMENT_METODE: "PEMBELIAN",

          STATUS: "Approved",

          CREATED_AT: Date.now(),
        });

        // ======================================
        // AUTO STOCK
        // ======================================
        await addStock(namaToko, sku, {
          brand,
          barang,
          qty,
        });
      }
    }

    return {
      success: true,
      message: "IMPORT PEMBELIAN BERHASIL",
    };
  } catch (err) {
    console.error(err);

    return {
      success: false,
      message: err.message,
    };
  }
};
