import {
  addTransaksi,
  listenAllTransaksi,
} from "../../../services/FirebaseService";

// ======================================================
// SAVE REFUND HISTORY
// ======================================================

export const saveRefundHistory = async ({ transaksi, userLogin }) => {
  if (!transaksi) return;

  const items = Array.isArray(transaksi.items) ? transaksi.items : [];

  for (const item of items) {
    // ==========================================
    // IMEI
    // ==========================================
    if (Array.isArray(item.imeiList) && item.imeiList.length) {
      for (const imei of item.imeiList) {
        await addTransaksi(transaksi.tokoId, {
          PAYMENT_METODE: "REFUND",
          STATUS: "REFUND",

          IS_REFUND: true,

          TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),

          NO_INVOICE: `REF-${transaksi.invoice}`,

          NAMA_TOKO: transaksi.toko,

          NAMA_BRAND: item.namaBrand,

          NAMA_BARANG: item.namaBarang,

          IMEI: imei,

          QTY: 1,

          KETERANGAN: "REFUND PENJUALAN",

          CREATED_AT: Date.now(),

          REFUNDED_BY: userLogin?.username || userLogin?.nama || "SYSTEM",
        });
      }

      continue;
    }

    // ==========================================
    // NON IMEI
    // ==========================================
    await addTransaksi(transaksi.tokoId, {
      PAYMENT_METODE: "REFUND",
      STATUS: "REFUND",

      IS_REFUND: true,

      TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),

      NO_INVOICE: `REF-${transaksi.invoice}`,

      NAMA_TOKO: transaksi.toko,

      NAMA_BRAND: item.namaBrand,

      NAMA_BARANG: item.namaBarang,

      IMEI: "NON IMEI",

      QTY: Number(item.qty || item.QTY || 1),

      KETERANGAN: "REFUND PENJUALAN",

      CREATED_AT: Date.now(),

      REFUNDED_BY: userLogin?.username || userLogin?.nama || "SYSTEM",
    });
  }

  return true;
};

// ======================================================
// GET REFUND HISTORY
// ======================================================

export const getRefundHistory = (callback) => {
  return listenAllTransaksi((data = []) => {
    const rows = [];

    data.forEach((t) => {
      const isRefund =
        String(t?.PAYMENT_METODE || "").toUpperCase() === "REFUND" ||
        String(t?.STATUS || "").toUpperCase() === "REFUND" ||
        String(t?.statusPembayaran || "").toUpperCase() === "REFUND" ||
        t?.IS_REFUND === true;

      if (!isRefund) return;

      rows.push({
        id: t.id || `${t.NO_INVOICE}-${t.IMEI}`,

        TANGGAL_TRANSAKSI: t.TANGGAL_TRANSAKSI || t.tanggal || "-",

        NAMA_TOKO: t.NAMA_TOKO || t.toko || "-",

        NAMA_BRAND: t.NAMA_BRAND || "-",

        NAMA_BARANG: t.NAMA_BARANG || "-",

        IMEI: t.IMEI || "NON IMEI",

        QTY: Number(t.QTY || 1),

        NO_INVOICE: t.NO_INVOICE || t.invoice || "-",

        KETERANGAN: t.KETERANGAN || "REFUND PENJUALAN",
      });
    });

    callback(
      rows.sort(
        (a, b) => new Date(b.TANGGAL_TRANSAKSI) - new Date(a.TANGGAL_TRANSAKSI)
      )
    );
  });
};
