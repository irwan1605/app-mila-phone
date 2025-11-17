// Sumber data stok untuk Accessories, Handphone, dan Motor Listrik.
// Jika kamu menjalankan scripts/build-stock.js dari Excel, file ini bisa ditimpa otomatis.
// Struktur item standar:
// { brand, name, warna?, stok?, lokasi?, sku?, baterai?, charger?, srp?, grosir?, note? }

/** @typedef {Object} StockItem
 * @property {string} brand
 * @property {string} name
 * @property {string=} warna
 * @property {number=} stok
 * @property {string=} lokasi
 * @property {string=} sku
 * @property {string=} baterai
 * @property {string=} charger
 * @property {number=} srp
 * @property {number=} grosir
 * @property {string=} note
 */

/* =========================
   A. DATA: ACCESSORIES
   ========================= */
/** @type {StockItem[]} */
export const STOCK_ACCESSORIES = [
  { brand: "Universal", name: "Helm Bogo",       warna: "Hitam", stok: 14, lokasi: "Rak ACC-1", sku: "ACC-BOGO-BLK", srp: 250000, grosir: 215000, note: "" },
  { brand: "Universal", name: "Helm Bogo",       warna: "Putih", stok: 10, lokasi: "Rak ACC-1", sku: "ACC-BOGO-WHT", srp: 250000, grosir: 215000, note: "" },
  { brand: "Universal", name: "Jas Hujan",       warna: "Navy",  stok: 25, lokasi: "Rak ACC-2", sku: "ACC-RAIN-NVY", srp: 180000, grosir: 150000, note: "" },
  { brand: "FDR",       name: "Ban Dalam 16",    warna: "",      stok: 30, lokasi: "Rak ACC-3", sku: "ACC-BDL16",     srp: 65000,  grosir: 52000,  note: "" },
  { brand: "Swallow",   name: "Ban Luar 16",     warna: "",      stok: 20, lokasi: "Rak ACC-3", sku: "ACC-BLR16",     srp: 170000, grosir: 145000, note: "" },
  { brand: "Universal", name: "Pompa Ban",       warna: "",      stok: 12, lokasi: "Rak ACC-4", sku: "ACC-POMPA",     srp: 90000,  grosir: 75000,  note: "" },
];

/* =========================
   B. DATA: HANDPHONE
   ========================= */
/** @type {StockItem[]} */
export const STOCK_HANDPHONE = [
  { brand: "Apple",   name: "iPhone 12 128GB",   warna: "Black",  stok: 4, lokasi: "HP-ET1", sku: "HP-IP12-128-BLK", srp: 9500000,  grosir: 9200000, note: "" },
  { brand: "Apple",   name: "iPhone 12 128GB",   warna: "White",  stok: 3, lokasi: "HP-ET1", sku: "HP-IP12-128-WHT", srp: 9500000,  grosir: 9200000, note: "" },
  { brand: "Samsung", name: "Galaxy S21 128GB",  warna: "Gray",   stok: 5, lokasi: "HP-ET2", sku: "HP-S21-128-GRY",  srp: 7500000,  grosir: 7200000, note: "" },
  { brand: "Xiaomi",  name: "Redmi Note 13 8/256", warna: "Blue", stok: 6, lokasi: "HP-ET3", sku: "HP-RN13-256-BLU", srp: 3600000,  grosir: 3400000, note: "" },
  { brand: "OPPO",    name: "Reno 11 8/256",     warna: "Green",  stok: 5, lokasi: "HP-ET2", sku: "HP-RE11-256-GRN", srp: 5200000,  grosir: 4950000, note: "" },
  { brand: "vivo",    name: "V27 8/256",         warna: "Black",  stok: 7, lokasi: "HP-ET3", sku: "HP-V27-256-BLK",  srp: 4500000,  grosir: 4300000, note: "" },
];

/* =========================
   C. DATA: MOTOR LISTRIK
   ========================= */
/** @type {StockItem[]} */
export const STOCK_MOTOR_LISTRIK = [
  { brand: "Uwinfly", name: "T90 Lithium",    warna: "Hitam", baterai: "Lithium 60V 23Ah", charger: "6A", stok: 3, lokasi: "Gdg-1", sku: "ML-UW-T90-BLK", srp: 15500000, grosir: 14900000, note: "" },
  { brand: "Uwinfly", name: "T90 Lithium",    warna: "Merah", baterai: "Lithium 60V 23Ah", charger: "6A", stok: 2, lokasi: "Gdg-1", sku: "ML-UW-T90-RED", srp: 15500000, grosir: 14900000, note: "" },
  { brand: "Selis",   name: "Eagle Lithium",  warna: "Hitam", baterai: "Lithium 60V 20Ah", charger: "5A", stok: 4, lokasi: "Gdg-2", sku: "ML-SL-EAG-BLK", srp: 13500000, grosir: 12900000, note: "" },
  { brand: "Viar",    name: "Q1",             warna: "Putih", baterai: "Lithium 60V 22Ah", charger: "6A", stok: 2, lokasi: "Gdg-2", sku: "ML-VR-Q1-WHT",  srp: 17000000, grosir: 16500000, note: "" },
  { brand: "Volta",   name: "301",            warna: "Biru",  baterai: "Lithium 60V 21Ah", charger: "5A", stok: 5, lokasi: "Gdg-3", sku: "ML-VO-301-BLU", srp: 12000000, grosir: 11500000, note: "" },
  { brand: "NIU",     name: "UQi GT",         warna: "Hitam", baterai: "Lithium 48V 31Ah", charger: "7A", stok: 1, lokasi: "Gdg-3", sku: "ML-NIU-UQI-BLK", srp: 23500000, grosir: 22800000, note: "" },
];

/* =========================
   Gabungan per kategori
   ========================= */
export const STOCK_ALL = {
  accessories: STOCK_ACCESSORIES,
  handphone: STOCK_HANDPHONE,
  motor_listrik: STOCK_MOTOR_LISTRIK,
};

/* =========================
   Helper & Indexer
   ========================= */

function _normStr(v) {
  return (v ?? "").toString().trim();
}
function _lc(v) {
  return _normStr(v).toLowerCase();
}
function _getDataByCategory(category = "motor_listrik") {
  switch ((_normStr(category) || "motor_listrik").toLowerCase()) {
    case "accessories":
      return STOCK_ACCESSORIES;
    case "handphone":
      return STOCK_HANDPHONE;
    default:
      return STOCK_MOTOR_LISTRIK;
  }
}

/**
 * Bangun index brand→products (dengan daftar warna unik) untuk suatu kategori.
 * @param {"accessories"|"handphone"|"motor_listrik"} [category="motor_listrik"]
 * @returns {Array<{brand: string, products: Array<{name: string, warna: string[]}>}>}
 */
export function getStockIndex(category = "motor_listrik") {
  const data = _getDataByCategory(category);
  const brandMap = new Map();

  for (const raw of data) {
    const brand = _normStr(raw.brand);
    const name = _normStr(raw.name);
    const warna = _normStr(raw.warna);

    if (!brand || !name) continue;
    if (!brandMap.has(brand)) brandMap.set(brand, new Map());
    const prodMap = brandMap.get(brand);

    if (!prodMap.has(name)) prodMap.set(name, new Set());
    if (warna) prodMap.get(name).add(warna); // hanya push warna jika ada
  }

  const out = [];
  for (const [brand, prodMap] of brandMap.entries()) {
    const products = [];
    for (const [name, warnaSet] of prodMap.entries()) {
      products.push({ name, warna: Array.from(warnaSet).sort((a, b) => a.localeCompare(b, "id")) });
    }
    products.sort((a, b) => a.name.localeCompare(b.name, "id"));
    out.push({ brand, products });
  }
  out.sort((a, b) => a.brand.localeCompare(b.brand, "id"));
  return out;
}

/**
 * Dapatkan daftar produk (name) berdasarkan brand untuk suatu kategori.
 * @param {"accessories"|"handphone"|"motor_listrik"} category
 * @param {string} brand
 * @returns {string[]}
 */
export function getProductsByBrand(category, brand) {
  const data = _getDataByCategory(category);
  const b = _lc(brand);
  const set = new Set(
    data.filter((r) => _lc(r.brand) === b).map((r) => _normStr(r.name)).filter(Boolean)
  );
  return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
}

/**
 * Dapatkan daftar warna berdasarkan brand & name (produk) untuk suatu kategori.
 * @param {"accessories"|"handphone"|"motor_listrik"} category
 * @param {string} brand
 * @param {string} name
 * @returns {string[]}
 */
export function getWarnaByBrandProduct(category, brand, name) {
  const data = _getDataByCategory(category);
  const b = _lc(brand);
  const n = _lc(name);
  const set = new Set(
    data
      .filter((r) => _lc(r.brand) === b && _lc(r.name) === n)
      .map((r) => _normStr(r.warna))
      .filter(Boolean)
  );
  return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
}

/**
 * Cari satu baris stok spesifik (opsional filter warna).
 * @param {{category?: "accessories"|"handphone"|"motor_listrik", brand: string, name: string, warna?: string}} p
 * @returns {StockItem|null}
 */
export function findStock({ category = "motor_listrik", brand, name, warna }) {
  const data = _getDataByCategory(category);
  const b = _lc(brand);
  const n = _lc(name);
  const w = _lc(warna || "");
  return (
    data.find(
      (r) =>
        _lc(r.brand) === b &&
        _lc(r.name) === n &&
        (!w || _lc(r.warna || "") === w)
    ) || null
  );
}

/**
 * Ambil semua varian warna untuk kombinasi brand+name.
 * @param {{category?: "accessories"|"handphone"|"motor_listrik", brand: string, name: string}} p
 * @returns {StockItem[]}
 */
export function findAllVariant({ category = "motor_listrik", brand, name }) {
  const data = _getDataByCategory(category);
  const b = _lc(brand);
  const n = _lc(name);
  return data.filter((r) => _lc(r.brand) === b && _lc(r.name) === n);
}

/**
 * Ambil nilai stok aman (0 jika tidak ditemukan).
 * @param {{category?: "accessories"|"handphone"|"motor_listrik", brand: string, name: string, warna?: string}} p
 * @returns {number}
 */
export function getStokValue(p) {
  const row = findStock(p);
  return Number.isFinite(row?.stok) ? Number(row.stok) : 0;
}

/**
 * Ambil harga SRP/Grosir aman (0 jika tidak ditemukan) + 'prefer' (pilihan utama).
 * @param {{category?: "accessories"|"handphone"|"motor_listrik", brand: string, name: string, warna?: string, prefer?: "srp"|"grosir"}} p
 * @returns {{srp: number, grosir: number, prefer: number}}
 */
export function getHargaValue({
  category = "motor_listrik",
  brand,
  name,
  warna,
  prefer = "grosir",
}) {
  const row = findStock({ category, brand, name, warna });
  const srp = Number.isFinite(row?.srp) ? Number(row.srp) : 0;
  const grosir = Number.isFinite(row?.grosir) ? Number(row.grosir) : 0;
  return { srp, grosir, prefer: prefer === "srp" ? srp : grosir };
}

export default {
  STOCK_ACCESSORIES,
  STOCK_HANDPHONE,
  STOCK_MOTOR_LISTRIK,
  STOCK_ALL,
  getStockIndex,
  getProductsByBrand,
  getWarnaByBrandProduct,
  findStock,
  findAllVariant,
  getStokValue,
  getHargaValue,
};

