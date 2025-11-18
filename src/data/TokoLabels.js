// src/data/TokoLabels.js
// Satu sumber nama toko untuk seluruh aplikasi.

const TOKO_LABELS = {
  1: "CILANGKAP",
  2: "CIBINONG",
  3: "GAS ALAM",
  4: "CITEUREUP",
  5: "CIRACAS",
  6: "METLAND 1",
  7: "METLAND 2",
  8: "PITARA",
  9: "KOTA WISATA",
  10: "SAWANGAN", // fallback, silakan ganti jika ada nama resmi
};

export default TOKO_LABELS;

// Helper opsional (berguna untuk iterasi & guard)
export const ALL_TOKO_IDS = Object.keys(TOKO_LABELS).map(Number);
export const getTokoLabel = (id) => TOKO_LABELS[Number(id)] || `Toko ${id}`;
