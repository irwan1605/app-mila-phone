export const canResellIMEI = (stock = {}) => {
    const status = String(
      stock?.status ||
        stock?.STATUS ||
        ""
    )
      .trim()
      .toUpperCase();
  
    const lastAction = String(
      stock?.LAST_ACTION || ""
    )
      .trim()
      .toUpperCase();
  
    const paymentMetode = String(
      stock?.PAYMENT_METODE || ""
    )
      .trim()
      .toUpperCase();
  
    const statusRefund = String(
      stock?.statusRefund || ""
    )
      .trim()
      .toUpperCase();
  
    // =====================================
    // REFUND
    // =====================================
    if (
      stock?.READY_RESALE === true ||
      statusRefund === "READY_RESALE"
    ) {
      return true;
    }
  
    // =====================================
    // REJECT
    // =====================================
    if (
      lastAction === "REJECT" &&
      status === "AVAILABLE"
    ) {
      return true;
    }
  
    // =====================================
    // TRANSFER MASUK
    // =====================================
    if (
      lastAction === "TRANSFER" &&
      status === "AVAILABLE"
    ) {
      return true;
    }
  
    // =====================================
    // PAYMENT METODE
    // =====================================
    if (
      [
        "REFUND",
        "READY_RESALE",
        "TRANSFER_MASUK",
      ].includes(paymentMetode)
    ) {
      return true;
    }
  
    // =====================================
    // AVAILABLE NORMAL
    // =====================================
    if (
      status === "AVAILABLE" &&
      stock?.sold !== true
    ) {
      return true;
    }
  
    return false;
  };