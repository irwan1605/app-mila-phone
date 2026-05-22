// src/transfer/services/approveTransferService.js

import { ref, push, update } from "firebase/database";

import { db } from "../../firebase";

export const approveTransferFINAL = async ({ transfer }) => {
  try {
    const {
      tokoPengirim,
      ke,
      brand,
      barang,
      kategori,
      imeis,
      noDo,
      noSuratJalan,
      tanggal,
    } = transfer;

    const approvedAt = Date.now();

    for (const imei of imeis || []) {
      // =====================================
      // TRANSFER KELUAR
      // =====================================
      await push(ref(db, `toko/${tokoPengirim}/transaksi`), {
        TANGGAL_TRANSAKSI: tanggal,
        NO_INVOICE: noDo,
        NO_SURAT_JALAN: noSuratJalan,

        NAMA_TOKO: tokoPengirim,

        NAMA_BRAND: brand,
        NAMA_BARANG: barang,
        KATEGORI_BRAND: kategori,

        IMEI: imei,

        PAYMENT_METODE: "TRANSFER_KELUAR",

        STATUS: "APPROVED",

        CREATED_AT: approvedAt,
        UPDATED_AT: approvedAt,
      });

      // =====================================
      // TRANSFER MASUK
      // =====================================
      await push(ref(db, `toko/${ke}/transaksi`), {
        TANGGAL_TRANSAKSI: tanggal,
        NO_INVOICE: noSuratJalan,
        NO_SURAT_JALAN: noSuratJalan,

        NAMA_TOKO: ke,

        NAMA_BRAND: brand,
        NAMA_BARANG: barang,
        KATEGORI_BRAND: kategori,

        IMEI: imei,

        PAYMENT_METODE: "TRANSFER_MASUK",

        STATUS: "APPROVED",

        CREATED_AT: approvedAt,
        UPDATED_AT: approvedAt,
      });
    }

    // =====================================
    // UPDATE STATUS TRANSFER
    // =====================================
    await update(ref(db, `transfer_barang/${transfer.id}`), {
      status: "APPROVED",
      approvedAt,
    });

    return true;
  } catch (err) {
    console.error("❌ approveTransferFINAL ERROR:", err);

    return false;
  }
};
