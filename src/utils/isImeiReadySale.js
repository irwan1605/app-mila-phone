export const isImeiReadySale = (stock = {}) => {
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
  
    const statusRefund = String(
      stock?.statusRefund || ""
    )
      .trim()
      .toUpperCase();
  
    if (stock?.READY_RESALE === true) {
      return true;
    }
  
    if (statusRefund === "READY_RESALE") {
      return true;
    }
  
    if (
      ["REFUND", "REJECT", "TRANSFER"].includes(
        lastAction
      )
    ) {
      return true;
    }
  
    if (
      status === "AVAILABLE" &&
      stock?.sold !== true
    ) {
      return true;
    }
  
    return false;
  };