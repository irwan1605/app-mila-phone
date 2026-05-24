import { buildFinalStockRows } from "../buildFinalStockRows";

// ======================================
// 🔥 FINAL SOURCE DASHBOARD
// WAJIB SAMA DENGAN DETAIL STOCK
// ======================================

export const buildDashboardStockRows = ({
  transaksi = [],
  detailStock = {},
  namaToko = "",
  masterMap = {},
  supplierLookup = {},
}) => {
  return buildFinalStockRows({
    transaksi,
    detailStock,
    namaToko,
    masterMap,
    supplierLookup,
  });
};