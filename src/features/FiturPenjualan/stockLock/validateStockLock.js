// =====================================================
// VALIDATE STOCK LOCK
// =====================================================

const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

export const validateStockLock = ({
  stockMap = {},
  namaBarang = "",
  namaBrand = "",
  qty = 0,
}) => {
  const key = `${normalize(namaBrand)}|${normalize(namaBarang)}`;

  const stok = Number(stockMap[key] || 0);

  if (stok < Number(qty || 0)) {
    throw new Error(
      `❌ STOCK TIDAK CUKUP : ${namaBarang}\n` +
        `STOK : ${stok}\n` +
        `INPUT : ${qty}`
    );
  }

  return true;
};
