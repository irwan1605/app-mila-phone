import { normalizeText } from "./transferHelpers";

// ======================================
// 🔥 VALIDASI STOCK NON IMEI
// ======================================

export const validateTransferQty = ({
  stock = [],
  brand = "",
  barang = "",
  qty = 0,
}) => {
  const found = stock.find(
    (s) =>
      normalizeText(s.NAMA_BRAND) === normalizeText(brand) &&
      normalizeText(s.NAMA_BARANG) === normalizeText(barang)
  );

  const currentStock = Number(found?.qty || 0);

  if (Number(qty) > currentStock) {
    throw new Error(`❌ STOCK TIDAK MENCUKUPI (${currentStock})`);
  }

  return true;
};
