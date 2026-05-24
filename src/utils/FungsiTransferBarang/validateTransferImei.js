import { normalizeImei } from "./transferHelpers";

// ======================================
// 🔥 VALIDASI DUPLICATE IMEI
// ======================================

export const validateTransferImei = (imeis = []) => {
  const cleanImeis = imeis.map((i) => normalizeImei(i)).filter(Boolean);

  const duplicate = cleanImeis.find(
    (imei, index) => cleanImeis.indexOf(imei) !== index
  );

  if (duplicate) {
    throw new Error(`❌ IMEI DUPLICATE: ${duplicate}`);
  }

  return cleanImeis;
};
