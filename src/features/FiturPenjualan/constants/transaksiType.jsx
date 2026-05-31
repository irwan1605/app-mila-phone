// ======================================================
// TRANSACTION TYPE CONSTANT
// ======================================================

export const TRANSACTION_TYPE = {
    PEMBELIAN: "PEMBELIAN",
  
    PENJUALAN: "PENJUALAN",
  
    REFUND: "REFUND",
  
    REJECT: "REJECT",
  
    TRANSFER_BARANG: "TRANSFER BARANG",
  
    TRANSFER_MASUK: "TRANSFER_MASUK",
  
    TRANSFER_KELUAR: "TRANSFER_KELUAR",
  
    TRANSFER_REJECT: "TRANSFER_REJECT",
  };
  
  // ======================================================
  // STATUS YANG MEMBUAT IMEI AKTIF KEMBALI
  // ======================================================
  
  export const RESALE_ALLOWED_TYPES = [
    TRANSACTION_TYPE.PEMBELIAN,
  
    TRANSACTION_TYPE.REFUND,
  
    TRANSACTION_TYPE.REJECT,
  
    TRANSACTION_TYPE.TRANSFER_BARANG,
  
    TRANSACTION_TYPE.TRANSFER_MASUK,
  
    TRANSACTION_TYPE.TRANSFER_REJECT,
  ];
  
  // ======================================================
  // STATUS YANG TIDAK BOLEH DIJUAL
  // ======================================================
  
  export const SOLD_TYPES = [
    TRANSACTION_TYPE.PENJUALAN,
  ];
  
  // ======================================================
  // CEK BOLEH DIJUAL KEMBALI
  // ======================================================
  
  export const canResellIMEI = (transaksi = {}) => {
    const metode = String(
      transaksi?.PAYMENT_METODE ||
        transaksi?.jenisTransaksi ||
        transaksi?.statusRefund ||
        ""
    )
      .trim()
      .toUpperCase();
  
    return RESALE_ALLOWED_TYPES.includes(metode);
  };
  
  // ======================================================
  // CEK SUDAH TERJUAL
  // ======================================================
  
  export const isSoldIMEI = (transaksi = {}) => {
    const metode = String(
      transaksi?.PAYMENT_METODE || ""
    )
      .trim()
      .toUpperCase();
  
    return SOLD_TYPES.includes(metode);
  };
  
  // ======================================================
  // FINAL STATUS ENGINE
  // ======================================================
  
  export const getTransactionFinalStatus = (transaksi = {}) => {
    const metode = String(
      transaksi?.PAYMENT_METODE || ""
    )
      .trim()
      .toUpperCase();
  
    if (RESALE_ALLOWED_TYPES.includes(metode)) {
      return "AVAILABLE";
    }
  
    if (SOLD_TYPES.includes(metode)) {
      return "SOLD";
    }
  
    return "UNKNOWN";
  };