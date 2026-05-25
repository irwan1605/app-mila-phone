// features/FiturPenjualan/refund/processRefund.js

import { validateRefund } from "./validateRefund";
import { restoreStockRefund } from "./restoreStockRefund";
import { saveRefundHistory } from "./refundHistory";

export const processRefund = async ({
  transaksi,
  userLogin,
}) => {
  await validateRefund(transaksi);

  await restoreStockRefund(transaksi);

  await saveRefundHistory({
    transaksi,
    userLogin,
  });

  return true;
};