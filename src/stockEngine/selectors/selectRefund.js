// ======================================================
// src/stockEngine/selectors/selectRefund.js
// ======================================================

export function selectRefund(validation) {
  return validation.rows.filter((r) => r.state === "ACTIVE");
}
