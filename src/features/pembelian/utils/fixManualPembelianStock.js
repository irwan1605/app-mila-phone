import { addStock } from "../../../services/FirebaseService";

const makeSku = (brand, barang) =>
  `${(brand || "").trim()}_${(barang || "").trim()}`.replace(/\s+/g, "_");

export const fixManualPembelianStock = async ({
  namaToko,
  brand,
  barang,
  qty,
}) => {
  try {
    const finalQty = Number(qty || 0);

    if (finalQty <= 0) {
      return;
    }

    const sku = makeSku(brand, barang);

    await addStock(namaToko, sku, {
      brand,
      barang,
      qty: finalQty,
    });

    console.log("✅ FIX STOCK PEMBELIAN", namaToko, brand, barang, finalQty);

    return true;
  } catch (err) {
    console.error("❌ fixManualPembelianStock Error", err);

    return false;
  }
};
