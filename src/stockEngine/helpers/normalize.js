// ==============================================
// src/stockEngine/helpers/normalize.js
// ==============================================

export const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

export const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

export const normalizeImei = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

export const normalizeNumber = (value) => {
  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
};

export const isEmpty = (value) =>
  value === null || value === undefined || String(value).trim() === "";
