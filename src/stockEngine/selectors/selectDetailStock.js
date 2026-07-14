// ======================================================
// src/stockEngine/selectors/selectDetailStock.js
// ======================================================

export function selectDetailStock(validation) {
  return {
    rows: validation.rows,

    summary: validation.summary,
  };
}
