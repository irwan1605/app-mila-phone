// ======================================================
// src/stockEngine/selectors/selectStockOpname.js
// ======================================================

export function selectStockOpname(validation) {
  return {
    rows: validation.rows,

    summary: validation.summary,

    metrics: validation.metrics,
  };
}
