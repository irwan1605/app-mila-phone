// src/features/FiturPenjualan/constants/stockStatus.js

import { getFinalIMEIStatus } from "../../../utils/imeiStatusEngine";

/**
 * =====================================
 * BOLEH DIJUAL ?
 * =====================================
 */
export const canSellIMEI = (imeiHistory = []) => {
  const finalStatus = getFinalIMEIStatus(imeiHistory);

  return finalStatus === "AVAILABLE";
};

/**
 * =====================================
 * REFUND / REJECT
 * =====================================
 */
export const isRefundOrRejectItem = (imeiHistory = []) => {
  return imeiHistory.some((trx) =>
    ["REFUND", "TRANSFER_REJECT"].includes(
      String(trx.PAYMENT_METODE || "").toUpperCase()
    )
  );
};

/**
 * =====================================
 * STATUS DETAIL
 * =====================================
 */
export const getStockStatusInfo = (imeiHistory = []) => {
  const finalStatus = getFinalIMEIStatus(imeiHistory);

  return {
    finalStatus,

    canSell: finalStatus === "AVAILABLE",

    canTransfer: finalStatus === "AVAILABLE",

    isSold: finalStatus === "SOLD",

    isRefund: isRefundOrRejectItem(imeiHistory),

    isTransfering: finalStatus === "TRANSFERING",
  };
};
