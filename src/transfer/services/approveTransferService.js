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
      // 🔻 TRANSFER KELUAR
      // =====================================
      await push(ref(db, `toko/${tokoPengirim}/transaksi`), {
        TANGGAL_TRANSAKSI: tanggal,

        NO_INVOICE: noDo,
        NO_SURAT_JALAN: noSuratJalan,

        NAMA_TOKO: tokoPengirim,

        // 🔥 TRACK OWNER
        tokoPengirim,
        ke,
        tokoTujuan: ke,

        NAMA_BRAND: brand,
        NAMA_BARANG: barang,
        KATEGORI_BRAND: kategori,

        IMEI: imei,

        QTY: 1,

        PAYMENT_METODE: "TRANSFER_KELUAR",

        STATUS: "APPROVED",

        SYSTEM_PAYMENT: "SYSTEM",

        CREATED_AT: approvedAt,
        UPDATED_AT: approvedAt,
      });

      // =====================================
      // 🔺 TRANSFER MASUK
      // =====================================
      await push(ref(db, `toko/${ke}/transaksi`), {
        TANGGAL_TRANSAKSI: tanggal,

        NO_INVOICE: noSuratJalan,
        NO_SURAT_JALAN: noSuratJalan,

        // 🔥 OWNER FINAL
        NAMA_TOKO: ke,

        // 🔥 TRACK OWNER
        tokoPengirim,
        ke,
        tokoTujuan: ke,

        NAMA_BRAND: brand,
        NAMA_BARANG: barang,
        KATEGORI_BRAND: kategori,

        IMEI: imei,

        QTY: 1,

        PAYMENT_METODE: "TRANSFER_MASUK",

        // =====================================
        // 🔥 FINAL TRANSFER STATE
        // =====================================
        // SETELAH TRANSFER
        // BARANG MENJADI STOCK NORMAL
        // =====================================
        SUMBER_STOCK: "NORMAL",

        // =====================================
        // 🔥 BUKAN REFUND LAGI
        // =====================================
        IS_REFUND_TRANSFER: false,

        // =====================================
        // 🔥 LAST ACTION FINAL
        // =====================================
        LAST_ACTION: "TRANSFER",

      // =====================================
// 🔥 FINAL STATUS
// =====================================
STATUS: "Approved",

        SYSTEM_PAYMENT: "SYSTEM",

        CREATED_AT: approvedAt,
        UPDATED_AT: approvedAt,
      });
    }

    // =====================================
    // 🔥 UPDATE STATUS
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
