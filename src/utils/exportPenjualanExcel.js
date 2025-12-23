import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportPenjualanExcel = ({
  transaksi = [],
  fileName = "Laporan_Penjualan.xlsx",
}) => {
  if (!Array.isArray(transaksi) || transaksi.length === 0) {
    alert("❌ Tidak ada data untuk diexport");
    return;
  }

  const rows = [];

  transaksi.forEach((trx) => {
    const {
      invoice,
      toko,
      user = {},
      payment = {},
      items = [],
      createdAt,
      STATUS,
      totalBarang,
    } = trx;

    items.forEach((item) => {
      rows.push({
        TANGGAL: createdAt
          ? new Date(createdAt).toLocaleDateString("id-ID")
          : "",
        NO_INVOICE: invoice,
        NAMA_TOKO: toko,
        NAMA_PELANGGAN: user.namaPelanggan || "",
        ID_PELANGGAN: user.idPelanggan || "",
        NO_TELP: user.noTelepon || "",
        NAMA_SALES: user.namaSales || "",
        SALES_TITIPAN: user.salesTitipan || "",

        KATEGORI_BAYAR: payment.kategoriBayar || "",
        PAYMENT_METHOD: payment.paymentMethod || "",
        MDR_PERSEN: payment.mdr || 0,
        NOMINAL_MDR: payment.nominalMdr || 0,
        DP_USER: payment.dpUser || 0,
        DP_TALANGAN: payment.dpTalangan || 0,
        DP_MERCHANT: payment.dpMerchant || 0,
        VOUCHER: payment.voucher || 0,
        TENOR: payment.tenor || "",

        SKU: item.sku || "",
        KATEGORI_BARANG: item.kategoriBarang || "",
        NAMA_BRAND: item.namaBrand || "",
        NAMA_BARANG: item.namaBarang || "",
        IMEI: item.imei || "",
        QTY: item.qty || 1,
        HARGA_UNIT: item.hargaUnit || 0,
        TOTAL_ITEM:
          Number(item.hargaUnit || 0) * Number(item.qty || 1),

        GRAND_TOTAL: totalBarang || 0,
        STATUS: STATUS || "",
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Penjualan");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, fileName);
};
