// ======================================================
// src/stockEngine/selectors/selectDashboard.js
// ======================================================

export function selectDashboard(validation) {
  const {
    rows,

    summary,

    metrics,
  } = validation;

  return {
    rows,

    cards: {
      totalStock: summary.totalRows,

      totalQty: summary.totalQty,

      totalImei: summary.imeiCount,

      totalNonImei: summary.nonImeiCount,
    },

    metrics,
  };
}
