// ======================================================
// src/stockEngine/selectors/selectTransfer.js
// ======================================================

export function selectTransfer(validation) {
  return validation.rows.filter((r) => r.state === "ACTIVE");
}
