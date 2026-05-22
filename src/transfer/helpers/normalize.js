// src/transfer/helpers/normalize.js

export const normalize = (v) =>
    String(v || "")
      .trim()
      .toUpperCase();
  
  export const normalizeText = (v) =>
    String(v || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  
  export const normalizeImei = (v) =>
    String(v || "")
      .trim()
      .replace(/\s+/g, "")
      .toUpperCase();
  
  export const safeNumber = (v) => {
    const n = Number(v || 0);
    return isNaN(n) ? 0 : n;
  };