export const buildInventoryReportSuperAdmin = ({ detailStock = {} }) => {
  const tokoMap = {};

  Object.entries(detailStock || {}).forEach(([stockKey, stockData]) => {
    const qty = Number(stockData?.qty || stockData || 0);

    // stok kosong langsung skip
    if (qty <= 0) return;

    const parts = String(stockKey)
      .split("|")
      .map((x) =>
        String(x || "")
          .trim()
          .toUpperCase()
      );

    const namaToko = parts[0];

    if (!namaToko) return;

    let kategori = String(
      stockData?.kategori || stockData?.KATEGORI_BRAND || "LAINNYA"
    )
      .trim()
      .toUpperCase();

    if (kategori === "ACCESSORY") {
      kategori = "ACCESSORIES";
    }

    if (kategori === "SPAREPART") {
      kategori = "SPARE PART";
    }

    if (!tokoMap[namaToko]) {
      tokoMap[namaToko] = {};
    }

    tokoMap[namaToko][kategori] = (tokoMap[namaToko][kategori] || 0) + qty;
  });

  return Object.entries(tokoMap)
    .map(([toko, kategori]) => ({
      toko,
      kategori,
    }))
    .filter((row) => {
      const total = Object.values(row.kategori || {}).reduce(
        (sum, qty) => sum + Number(qty || 0),
        0
      );

      return total > 0;
    });
};
