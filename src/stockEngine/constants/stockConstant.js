// ==============================================
// src/stockEngine/constants/stockConstant.js
// ==============================================

export const STATUS = Object.freeze({
  ACTIVE: "ACTIVE",

  SOLD: "SOLD",

  TRANSFER: "TRANSFER",

  REFUND: "REFUND",

  RETUR: "RETUR",

  REJECT: "REJECT",

  OPNAME: "OPNAME",

  VOID: "VOID",

  DELETED: "DELETED",
});

export const STOCK_IN = Object.freeze([
  "PEMBELIAN",

  "TRANSFER_MASUK",

  "TRANSFER_REJECT",

  "REFUND",

  "RETUR",

  "VOID OPNAME",
]);

export const STOCK_OUT = Object.freeze([
  "PENJUALAN",

  "TRANSFER_KELUAR",

  "REJECT",

  "STOK OPNAME",
]);

export const VALID_STATUS = Object.freeze(["APPROVED", "REFUND"]);

export const IMEI_CATEGORY = Object.freeze([
  "HANDPHONE",

  "SEPEDA LISTRIK",

  "MOTOR LISTRIK",
]);
