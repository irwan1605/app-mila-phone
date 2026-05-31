// ======================================
// IMEI BOLEH DIJUAL KEMBALI
// ======================================
export const isResellAllowed = (
    imei,
    detailStockLookup = {}
  ) => {
    const stock =
      detailStockLookup?.[imei] ||
      Object.values(detailStockLookup || {}).find(
        (x) =>
          String(
            x?.imei ||
              x?.IMEI ||
              ""
          )
            .trim()
            .toUpperCase() ===
          String(imei)
            .trim()
            .toUpperCase()
      );
  
    if (!stock) {
      return false;
    }
  
    const lastAction = String(
      stock.LAST_ACTION ||
        stock.PAYMENT_METODE ||
        stock.status ||
        stock.STATUS ||
        ""
    ).toUpperCase();
  
    return [
      "PEMBELIAN",
      "AVAILABLE",
      "REFUND",
      "REJECT",
      "TRANSFER_MASUK",
      "TRANSFER_REJECT",
      "READY_RESALE",
    ].includes(lastAction);
  };