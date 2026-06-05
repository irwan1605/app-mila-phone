import { addTransaksi } from "../../../services/FirebaseService";

export const saveManualPembelianQty = async ({
  tokoId,
  tanggal,
  noDo,
  supplier,
  namaToko,

  brand,
  kategoriBrand,
  barang,

  qty,
  hargaSup,

  hargaSRP = 0,
  hargaGrosir = 0,
  hargaReseller = 0,
}) => {
  const finalQty = Number(qty || 0);

  if (finalQty <= 0) {
    throw new Error("Qty tidak valid");
  }

  await addTransaksi(tokoId, {
    TANGGAL_TRANSAKSI: tanggal,
    NO_INVOICE: noDo,

    NAMA_SUPPLIER: supplier,
    NAMA_USER: "SYSTEM",

    NAMA_TOKO: namaToko,

    NAMA_BRAND: brand,
    KATEGORI_BRAND: kategoriBrand,
    NAMA_BARANG: barang,

    QTY: finalQty,
    QTY_INPUT_MANUAL: finalQty,

    IMEI: "",

    HARGA_SUPLAYER: Number(hargaSup || 0),
    HARGA_UNIT: Number(hargaSup || 0),

    TOTAL: Number(hargaSup || 0) * finalQty,

    HARGA_SRP: Number(hargaSRP || 0),
    HARGA_GROSIR: Number(hargaGrosir || 0),
    HARGA_RESELLER: Number(hargaReseller || 0),

    PAYMENT_METODE: "PEMBELIAN",
    SYSTEM_PAYMENT: "SYSTEM",

    STATUS: "Approved",
    CREATED_AT: Date.now(),
  });

  return true;
};
