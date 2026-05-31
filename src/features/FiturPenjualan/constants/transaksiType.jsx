// ======================================================
// TRANSACTION TYPE CONSTANT
// ======================================================

export const TRANSACTION_TYPE = {
    PEMBELIAN: "PEMBELIAN",
    TRANSFER_BARANG: "TRANSFER BARANG",
    PENJUALAN: "PENJUALAN",
    REFUND: "REFUND",
    REJECT: "REJECT",
  };
  
  // ======================================================
  // STATUS YANG MEMBUAT IMEI BISA DIJUAL LAGI
  // ======================================================
  
  export const RESALE_ALLOWED_TYPES = [
    TRANSACTION_TYPE.PEMBELIAN,
    TRANSACTION_TYPE.TRANSFER_BARANG,
    TRANSACTION_TYPE.REFUND,
    TRANSACTION_TYPE.REJECT,
  ];
  
  // ======================================================
  // CEK BOLEH DIJUAL KEMBALI
  // ======================================================
  
  export const canResellIMEI = (transaksi) => {
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

  export const getFinalIMEIStatus = (history = []) => {
    if (!history.length) return "NOT_FOUND";
  
    const last = history[history.length - 1];
  
    const metode = String(
      last.PAYMENT_METODE || ""
    )
      .trim()
      .toUpperCase();
  
    switch (metode) {
      case "PEMBELIAN":
      case "TRANSFER BARANG":
      case "TRANSFER_MASUK":
      case "TRANSFER_REJECT":
      case "REFUND":
      case "REJECT":
        return "AVAILABLE";
  
      case "PENJUALAN":
        return "SOLD";
  
      default:
        return "UNKNOWN";
    }
  };