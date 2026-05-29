// src/utils/imeiStatusEngine.js

export const getFinalIMEIStatus = (imeiHistory = []) => {
    if (!Array.isArray(imeiHistory) || imeiHistory.length === 0) {
      return "NOT_FOUND";
    }
  
    const sortedHistory = [...imeiHistory].sort(
      (a, b) =>
        (a.CREATED_AT || a.createdAt || 0) -
        (b.CREATED_AT || b.createdAt || 0)
    );
  
    const lastTransaction =
      sortedHistory[sortedHistory.length - 1];
  
    const metode = String(
      lastTransaction?.PAYMENT_METODE || ""
    )
      .trim()
      .toUpperCase();
  
    switch (metode) {
      case "PEMBELIAN":
      case "REFUND":
      case "TRANSFER_MASUK":
      case "TRANSFER_REJECT":
        return "AVAILABLE";
  
      case "PENJUALAN":
        return "SOLD";
  
      case "TRANSFER_KELUAR":
        return "TRANSFERING";
  
      default:
        return "UNKNOWN";
    }
  };
  
  export const isIMEIAvailable = (
    imeiHistory = []
  ) => {
    return (
      getFinalIMEIStatus(imeiHistory) ===
      "AVAILABLE"
    );
  };
  
  export const isIMEISold = (
    imeiHistory = []
  ) => {
    return (
      getFinalIMEIStatus(imeiHistory) ===
      "SOLD"
    );
  };
  
  export const isIMEITransfering = (
    imeiHistory = []
  ) => {
    return (
      getFinalIMEIStatus(imeiHistory) ===
      "TRANSFERING"
    );
  };