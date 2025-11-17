// src/data/ListDataPenjualan.js
// Kumpulan master list + helper untuk InputPenjualan & DashboardToko.

import { getBrandIndex } from "./MasterDataHargaPenjualan";

/* ===================== TOKO & SALES ===================== */

export const TOKO_LIST = [
  "CILANGKAP",
  "KONTEN LIVE",
  "GAS ALAM",
  "CITEUREUP",
  "CIRACAS",
  "METLAND 1",
  "METLAND 2",
  "PITARA",
  "KOTA WISATA",
];

/** Contoh data sales per toko (silakan sesuaikan/extend) */
export const SALES_PEOPLE = [
  // CIRACAS
  {
    name: "Andi",
    nik: "CR001",
    toko: "CIRACAS",
    store: "Ciracas Store",
    sh: "Rudi",
    sl: "Wulan",
    tuyul: "Budi",
  },
  {
    name: "Beni",
    nik: "CR002",
    toko: "CIRACAS",
    store: "Ciracas Store",
    sh: "Rudi",
    sl: "Wulan",
    tuyul: "Eka",
  },

  // CITEUREUP
  {
    name: "Citra",
    nik: "CT001",
    toko: "CITEUREUP",
    store: "Citeureup Store",
    sh: "Doni",
    sl: "Sari",
    tuyul: "Tio",
  },
  {
    name: "Dina",
    nik: "CT002",
    toko: "CITEUREUP",
    store: "Citeureup Store",
    sh: "Doni",
    sl: "Sari",
    tuyul: "Ari",
  },

  // GAS ALAM
  {
    name: "Eko",
    nik: "GA001",
    toko: "GAS ALAM",
    store: "Gas Alam Store",
    sh: "Hadi",
    sl: "Mila",
    tuyul: "Ucup",
  },

  // CILANGKAP
  {
    name: "Rama",
    nik: "CL001",
    toko: "CILANGKAP",
    store: "Cilangkap Store",
    sh: "Asep",
    sl: "Nina",
    tuyul: "Ardi",
  },

  // KOTA WISATA
  {
    name: "Sari",
    nik: "KW001",
    toko: "KOTA WISATA",
    store: "KW Store",
    sh: "Yoga",
    sl: "Rina",
    tuyul: "Iwan",
  },
];

export function getSalesByToko(tokoName) {
  const t = String(tokoName || "").toLowerCase();
  return SALES_PEOPLE.filter((s) => String(s.toko || "").toLowerCase() === t);
}

export function findSales(q) {
  if (!q) return [];
  const qq = String(q).toLowerCase();
  return SALES_PEOPLE.filter(
    (s) =>
      String(s.name).toLowerCase().includes(qq) ||
      String(s.nik).toLowerCase().includes(qq) ||
      String(s.toko).toLowerCase().includes(qq)
  );
}

/* ===================== HARGA & PAYMENT ===================== */

export const PAYMENT_METHODS = [
  "Cash",
  "Transfer",
  "Kredit",
  "Debit",
  "E-Wallet",
];

export const PRICE_CATEGORIES = ["Normal", "Promo", "Spesial"];
export const MP_PROTECT_OPTIONS = [
  "Tidak Ada",
  "Proteck Basic",
  "Proteck Plus",
  "Proteck Max",
];

/** Tenor umum */
export const TENOR_OPTIONS = [3, 6, 9, 12, 15, 18, 24];

/* ===================== MDR RULES ===================== */
/**
 * Hierarki prioritas:
 * 1) combo (toko+brand) > 2) toko > 3) brand > 4) default
 */
export const MDR_RULES = {
  default: {
    cash: 0,
    transfer: 0,
    kredit: 2.5,
    debit: 0.8,
    "e-wallet": 2.0,
  },
  toko: {
    ciracas: { kredit: 2.0, "e-wallet": 1.8 },
    citeureup: { kredit: 2.2 },
  },
  brand: {
    selis: { kredit: 2.2 },
    yadea: { kredit: 2.1 },
  },
  combo: {
    "ciracas::selis": { kredit: 2.0 }, // contoh override spesifik
  },
};

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase();
}

/**
 * Ambil MDR % berdasarkan method/toko/brand.
 * @param {{method:string, toko?:string, brand?:string}} args
 * @returns {number} persen
 */
export function getMdr({ method, toko, brand }) {
  const m = norm(method);
  const t = norm(toko);
  const b = norm(brand);

  // 1) combo
  if (t && b) {
    const key = `${t}::${b}`;
    const combo = MDR_RULES.combo?.[key];
    if (combo && combo[m] != null) return Number(combo[m]);
  }
  // 2) toko
  if (t) {
    const tk = MDR_RULES.toko?.[t];
    if (tk && tk[m] != null) return Number(tk[m]);
  }
  // 3) brand
  if (b) {
    const br = MDR_RULES.brand?.[b];
    if (br && br[m] != null) return Number(br[m]);
  }
  // 4) default
  return Number(MDR_RULES.default?.[m] ?? 0);
}

/* ===================== BUNGA / TENOR ===================== */
/**
 * Tabel bunga default & override (per method/brand/toko).
 * Nilai adalah persen per bulan (flat) contoh sederhana.
 */
const BUNGA_DEFAULT = {
  3: 1.2,
  6: 2.4,
  9: 3.6,
  12: 4.8,
  15: 6.0,
  18: 7.2,
  24: 9.6,
};
const BUNGA_BY_METHOD = {
  kredit: { 3: 1.5, 6: 3.0, 12: 6.0, 18: 9.0, 24: 12.0 },
  cash: { 3: 0.0, 6: 0.0, 12: 0.0 },
  transfer: { 3: 0.0, 6: 0.0, 12: 0.0 },
};

const BUNGA_OVERRIDE_TOKO = {
  ciracas: { kredit: { 12: 5.5 } }, // contoh: di CIRACAS tenor 12 bln 5.5%
};
const BUNGA_OVERRIDE_BRAND = {
  selis: { kredit: { 12: 5.2 } }, // contoh: brand Selis sedikit lebih murah
};

/**
 * @param {{tenor:number, method?:string, brand?:string, toko?:string}} args
 * @returns {number} persen
 */
export function getBungaByTenor({ tenor, method, brand, toko }) {
  const tnr = Number(tenor || 0);
  const m = norm(method || "cash");
  const b = norm(brand);
  const tk = norm(toko);

  // 1) override toko
  if (tk && BUNGA_OVERRIDE_TOKO[tk]?.[m]?.[tnr] != null) {
    return Number(BUNGA_OVERRIDE_TOKO[tk][m][tnr]);
  }
  // 2) override brand
  if (b && BUNGA_OVERRIDE_BRAND[b]?.[m]?.[tnr] != null) {
    return Number(BUNGA_OVERRIDE_BRAND[b][m][tnr]);
  }
  // 3) method
  if (BUNGA_BY_METHOD[m]?.[tnr] != null) return Number(BUNGA_BY_METHOD[m][tnr]);
  // 4) default
  return Number(BUNGA_DEFAULT[tnr] ?? 0);
}

/* ===================== BRAND/PRODUK/WARNA ===================== */
/** Build list dari MasterDataHargaPenjualan */
const _catalog = getBrandIndex();

export const BRAND_LIST = _catalog.map((b) => b.brand);
export const PRODUCT_LIST = _catalog.flatMap((b) =>
  b.products.map((p) => ({ brand: b.brand, name: p.name }))
);
export const WARNA_LIST = _catalog.flatMap((b) =>
  b.products.flatMap((p) =>
    p.warna.map((w) => ({ brand: b.brand, name: p.name, warna: w }))
  )
);

export function getProductsByBrand(brand) {
  const b = _catalog.find(
    (x) => (x.brand || "").toLowerCase() === String(brand).toLowerCase()
  );
  return b ? b.products.map((p) => p.name) : [];
}

export function getWarnaByBrandProduct(brand, productName) {
  const b = _catalog.find(
    (x) => (x.brand || "").toLowerCase() === String(brand).toLowerCase()
  );
  const p = b?.products.find(
    (pp) => (pp.name || "").toLowerCase() === String(productName).toLowerCase()
  );
  return p ? p.warna || [] : [];
}

/* ===================== BATERAI & CHARGER ===================== */
/** Contoh mapping sederhana per brand-produk */
const BATTERY_MAP = {
  selis: {
    "e-max": ["48V 20Ah", "60V 20Ah"],
    nava: ["60V 20Ah"],
  },
  united: {
    tx1800: ["60V 20Ah"],
    tx3000: ["72V 20Ah"],
  },
  yadea: {
    g5: ["60V 24Ah"],
    t9: ["60V 20Ah"],
  },

  /* contoh hp/acc bila diperlukan */
  samsung: { "galaxy a15": ["N/A"], "galaxy a55": ["N/A"] },
  xiaomi: { "redmi note 13": ["N/A"], "poco x6": ["N/A"] },
  "acc generic": { "helm sni": ["N/A"], "sarung tangan": ["N/A"] },
};

const CHARGER_MAP = {
  selis: { "e-max": ["2A", "3A"], nava: ["2A"] },
  united: { tx1800: ["2A"], tx3000: ["3A"] },
  yadea: { g5: ["2A"], t9: ["2A"] },

  samsung: { "galaxy a15": ["Type-C 25W"], "galaxy a55": ["Type-C 25W"] },
  xiaomi: { "redmi note 13": ["Type-C 33W"], "poco x6": ["Type-C 67W"] },
  "acc generic": { "helm sni": ["-"], "sarung tangan": ["-"] },
};

export function getBateraiByBrandProduct(brand, productName) {
  const b = norm(brand);
  const p = norm(productName);
  const arr = BATTERY_MAP[b]?.[p] || [];
  return Array.isArray(arr) ? arr : [];
}

export function getChargerByBrandProduct(brand, productName) {
  const b = norm(brand);
  const p = norm(productName);
  const arr = CHARGER_MAP[b]?.[p] || [];
  return Array.isArray(arr) ? arr : [];
}

/* ===================== EXPORT KOMPAT ===================== */
export const CATALOG_INDEX = _catalog; // kompatibel dengan import lama
export const BATTERY_LIST = []; // placeholder kompatibilitas
export const CHARGER_LIST = []; // placeholder kompatibilitas

export default {
  TOKO_LIST,
  SALES_PEOPLE,
  PAYMENT_METHODS,
  PRICE_CATEGORIES,
  MP_PROTECT_OPTIONS,
  TENOR_OPTIONS,
  MDR_RULES,
  BRAND_LIST,
  PRODUCT_LIST,
  WARNA_LIST,

  getSalesByToko,
  findSales,
  getMdr,
  getBungaByTenor,

  getProductsByBrand,
  getWarnaByBrandProduct,
  getBateraiByBrandProduct,
  getChargerByBrandProduct,

  CATALOG_INDEX,
  BATTERY_LIST,
  CHARGER_LIST,
};
