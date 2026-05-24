import { normalizeImei } from "./transferHelpers";

// ======================================
// 🔥 VALIDASI STOCK IMEI
// ======================================

export const validateTransferStock = ({ imeis = [], stock = [] }) => {
  imeis.forEach((imei) => {
    const found = stock.find(
      (s) => normalizeImei(s.IMEI) === normalizeImei(imei)
    );

    if (!found) {
      throw new Error(`❌ IMEI TIDAK TERSEDIA: ${imei}`);
    }
  });

  return true;
};
