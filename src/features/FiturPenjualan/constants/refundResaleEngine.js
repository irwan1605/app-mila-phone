// ======================================================
// REFUND RESALE ENGINE
// ======================================================

/**
 * IMEI hasil REFUND boleh dijual lagi
 * walaupun sudah pernah REFUND berkali-kali.
 */
export const canResaleAfterRefund = (stock = {}) => {
    const readyResale =
      stock?.READY_RESALE === true;
  
    const isRefund =
      String(
        stock?.LAST_ACTION ||
        stock?.PAYMENT_METODE ||
        ""
      )
        .trim()
        .toUpperCase() === "REFUND";
  
    return readyResale || isRefund;
  };
  
  /**
   * Ambil status final refund
   */
  export const getRefundStatus = (stock = {}) => {
    if (canResaleAfterRefund(stock)) {
      return "AVAILABLE";
    }
  
    return "LOCKED";
  };
  
  /**
   * Boleh dijual kembali
   */
  export const canSellRefundIMEI = (stock = {}) => {
    return getRefundStatus(stock) === "AVAILABLE";
  };