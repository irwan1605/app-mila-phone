export const calculatePembelianQty = ({ kategoriBrand, qty, imeis = [] }) => {
  const kategori = String(kategoriBrand || "")
    .trim()
    .toUpperCase();

  const kategoriImei = ["HANDPHONE", "SEPEDA LISTRIK", "MOTOR LISTRIK"];

  if (kategoriImei.includes(kategori)) {
    return imeis.length;
  }

  return Number(qty || 0);
};
