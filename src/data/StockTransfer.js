// src/data/StockTransfer.js
// Integrasi transfer stok PUSAT ⇄ TOKO (Accessories, Handphone, Motor Listrik)
//
// Prinsip kerja:
// - Sumber data dasar (base) tetap dari getStockIndex(tokoName) di StockBarang.js
// - Semua perubahan/penambahan disimpan sebagai "override lokal" per toko & kategori
//   di localStorage (format sama seperti halaman stok yang sudah kamu pakai).
// - Saat transfer: stok fisik (default) di asal berkurang, di tujuan bertambah.
//   Jika opsi syncSystem=true → stok sistem juga ikut disesuaikan.
// - Mencatat riwayat transfer di ledger (localStorage) agar bisa diaudit.
//
// Cara pakai ringkas:
//   import { transferStock } from "../data/StockTransfer";
//   await transferStock({
//     from: "PUSAT",
//     to: "CIRACAS",
//     category: "handphone", // "accessories" | "handphone" | "motor_listrik"
//     keyFields: { imei: "123", namaBarang: "iPhone 12" }, // atau { noDinamo, namaBarang } untuk motor_listrik
//     qty: 2,
//     mode: "fisik", // "fisik" | "sistem" | "both"
//     meta: { by: user?.username, note: "Kirim ke CIRACAS" },
//   });
//
//   // Untuk terima retur dari toko ke pusat → cukup tukar 'from' dan 'to'.
//
//   // (Opsional) agar halaman auto-refresh bila tab lain melakukan transfer:
//   import { onStockChange } from "../data/StockTransfer";
//   useEffect(() => onStockChange(() => forceReload()), []);
//

import * as XLSX from "xlsx";
import { getStockIndex } from "./StockBarang";

/* ===================== Konstanta & Utils ===================== */
export const CENTRAL_NAME = "PUSAT";

// Key localStorage yang sudah dipakai oleh halaman stok (biar sinkron):
const LOCAL_KEYS = {
  accessories: "MMT_STOCK_ACC_LOCAL_V1",
  handphone: "MMT_STOCK_HP_LOCAL_V1",
  motor_listrik: "MMT_STOCK_MOLIS_LOCAL_V1",
};

// (Optional) hidden keys — tidak wajib untuk operasi transfer, tapi disiapkan.
const HIDDEN_KEYS = {
  accessories: "MMT_STOCK_ACC_HIDDEN_V1",
  handphone: "MMT_STOCK_HP_HIDDEN_V1",
  motor_listrik: "MMT_STOCK_MOLIS_HIDDEN_V1",
};

// Ledger transfer untuk audit
const LEDGER_KEY = "MMT_TRANSFER_LEDGER_V1";

// Broadcaster versi stok untuk auto-refresh antar tab
const VERSION_KEY = "MMT_STOCK_VERSION";

const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
const TODAY = new Date().toISOString().slice(0, 10);

/* ===================== I/O localStorage ===================== */
function readObject(key) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}
function writeObject(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {}
}

function getLocalMap(category) {
  return readObject(LOCAL_KEYS[category]);
}
function setLocalMap(category, map) {
  writeObject(LOCAL_KEYS[category], map);
  bumpVersion();
}

function getLedger() {
  try {
    const s = localStorage.getItem(LEDGER_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}
function setLedger(arr) {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(arr));
  } catch {}
}
function bumpVersion() {
  try {
    localStorage.setItem(VERSION_KEY, String(Date.now()));
  } catch {}
}

/* ===================== Kunci item per kategori ===================== */
function makeKey(category, rowOrKeyFields) {
  const lower = {};
  for (const [k, v] of Object.entries(rowOrKeyFields || {})) {
    lower[k] = typeof v === "string" ? v.trim().toLowerCase() : v;
  }

  if (category === "motor_listrik") {
    const kd = (lower.noDinamo || lower.no_dinamo || "").toString().trim().toLowerCase();
    const nm = (lower.namaBarang || lower.nama || "").toString().trim().toLowerCase();
    return kd || nm; // kunci utama: noDinamo, fallback: nama
  }

  // accessories & handphone
  const imei = (lower.imei || "").toString().trim().toLowerCase();
  const nm = (lower.namaBarang || lower.nama || "").toString().trim().toLowerCase();
  return imei || nm; // kunci utama: imei, fallback: nama
}

function rowMatch(category, row, keyFields) {
  return makeKey(category, row) === makeKey(category, keyFields);
}

/* ===================== Baca stok terkini (base + local) ===================== */
export function getCurrentRow(tokoName, category, keyFields) {
  const idx = getStockIndex(tokoName) || {};
  const baseArr = idx?.[category] || [];
  const base = baseArr.find((r) => rowMatch(category, r, keyFields)) || null;

  const localMap = getLocalMap(category);
  const locals = Array.isArray(localMap[tokoName]) ? localMap[tokoName] : [];
  const localOv = locals
    .map((x) => normalizeLocalRow(category, x, tokoName))
    .find((r) => rowMatch(category, r, keyFields)) || null;

  // Prioritaskan override lokal (kalau ada)
  if (localOv) return localOv;

  // Jika tidak ada override → kembalikan base + normalisasi minimal
  if (base) return normalizeBaseRow(category, base, tokoName);

  // Tidak ada sama sekali → null
  return null;
}

function normalizeBaseRow(category, raw, tokoName) {
  if (category === "motor_listrik") {
    return {
      id: `${tokoName}::base::${makeKey(category, raw)}`,
      source: "base",
      tanggal: raw.tanggal ? String(raw.tanggal).slice(0, 10) : "",
      tokoName,
      namaBarang: raw.namaBarang || raw.nama || raw.name || raw.product || raw.tipe || "",
      noDinamo:
        (raw.noDinamo || raw.no_dinamo || raw.imei || raw.serial || "").toString(),
      stokSistem: toNum(raw.stokSistem ?? raw.stok_sistem ?? raw.stok ?? 0),
      stokFisik: toNum(raw.stokFisik ?? raw.stok_fisik ?? 0),
      keterangan: raw.keterangan || raw.note || "",
    };
  }

  // accessories / handphone
  return {
    id: `${tokoName}::base::${makeKey(category, raw)}`,
    source: "base",
    tanggal: raw.tanggal ? String(raw.tanggal).slice(0, 10) : "",
    tokoName,
    namaBarang: raw.namaBarang || raw.nama || raw.name || raw.product || "",
    imei: (raw.imei || raw.serial || "").toString(),
    stokSistem: toNum(raw.stokSistem ?? raw.stok_sistem ?? raw.stok ?? 0),
    stokFisik: toNum(raw.stokFisik ?? raw.stok_fisik ?? 0),
    keterangan: raw.keterangan || raw.note || "",
  };
}

function normalizeLocalRow(category, raw, tokoName) {
  // raw berasal dari LS → pastikan field lengkap
  if (category === "motor_listrik") {
    return {
      id:
        raw.id ||
        `${tokoName}::local::${Date.now()}::${Math.random().toString(36).slice(2, 8)}`,
      source: "local",
      tanggal: raw.tanggal ? String(raw.tanggal).slice(0, 10) : TODAY,
      tokoName,
      namaBarang: raw.namaBarang || "",
      noDinamo: (raw.noDinamo || raw.no_dinamo || "").toString(),
      stokSistem: toNum(raw.stokSistem),
      stokFisik: toNum(raw.stokFisik),
      keterangan: raw.keterangan || "",
    };
  }

  return {
    id:
      raw.id ||
      `${tokoName}::local::${Date.now()}::${Math.random().toString(36).slice(2, 8)}`,
    source: "local",
    tanggal: raw.tanggal ? String(raw.tanggal).slice(0, 10) : TODAY,
    tokoName,
    namaBarang: raw.namaBarang || "",
    imei: (raw.imei || "").toString(),
    stokSistem: toNum(raw.stokSistem),
    stokFisik: toNum(raw.stokFisik),
    keterangan: raw.keterangan || "",
  };
}

/* ===================== Mutasi stok di LS (override) ===================== */
function upsertLocalOverride(tokoName, category, row) {
  const local = getLocalMap(category);
  const arr = Array.isArray(local[tokoName]) ? [...local[tokoName]] : [];
  const key = makeKey(category, row);

  // hapus yang lama (berdasarkan key)
  const filtered = arr.filter((x) => makeKey(category, x) !== key);

  // tulis yang baru
  filtered.push({
    source: "local",
    tanggal: row.tanggal || TODAY,
    namaBarang: row.namaBarang || "",
    ...(category === "motor_listrik"
      ? { noDinamo: (row.noDinamo || "").toString() }
      : { imei: (row.imei || "").toString() }),
    stokSistem: toNum(row.stokSistem),
    stokFisik: toNum(row.stokFisik),
    keterangan: row.keterangan || "",
  });

  local[tokoName] = filtered;
  setLocalMap(category, local);
}

function ensureLocalRow(tokoName, category, keyFields) {
  const exists = getCurrentRow(tokoName, category, keyFields);
  if (exists) return exists;

  // Buat entri baru stok 0
  const blank =
    category === "motor_listrik"
      ? {
          source: "local",
          tanggal: TODAY,
          tokoName,
          namaBarang: keyFields.namaBarang || "",
          noDinamo: (keyFields.noDinamo || "").toString(),
          stokSistem: 0,
          stokFisik: 0,
          keterangan: "",
        }
      : {
          source: "local",
          tanggal: TODAY,
          tokoName,
          namaBarang: keyFields.namaBarang || "",
          imei: (keyFields.imei || "").toString(),
          stokSistem: 0,
          stokFisik: 0,
          keterangan: "",
        };

  upsertLocalOverride(tokoName, category, blank);
  return getCurrentRow(tokoName, category, keyFields);
}

/* ===================== Transfer Stok ===================== */
/**
 * @param {Object} opts
 * @param {string} opts.from - nama toko asal (mis: "PUSAT" atau "CIRACAS")
 * @param {string} opts.to - nama toko tujuan
 * @param {"accessories"|"handphone"|"motor_listrik"} opts.category
 * @param {Object} opts.keyFields - {imei, namaBarang} | {noDinamo, namaBarang}
 * @param {number} opts.qty - jumlah unit dipindahkan (>0)
 * @param {"fisik"|"sistem"|"both"} [opts.mode="fisik"] - jenis stok yang digeser
 * @param {boolean} [opts.allowNegative=false] - jika true, boleh minus di asal (tidak disarankan)
 * @param {boolean} [opts.syncSystem=false] - kalau mode="fisik" tapi ingin stok sistem ikut berubah
 * @param {Object} [opts.meta] - catatan tambahan (by, note, dsb)
 */
export async function transferStock(opts) {
  const {
    from,
    to,
    category,
    keyFields,
    qty,
    mode = "fisik",
    allowNegative = false,
    syncSystem = false,
    meta = {},
  } = opts || {};

  if (!from || !to) throw new Error("Parameter 'from' dan 'to' wajib ada.");
  if (from === to) throw new Error("Asal dan tujuan tidak boleh sama.");
  if (!category || !LOCAL_KEYS[category]) throw new Error("Kategori tidak dikenali.");
  const q = toNum(qty);
  if (!(q > 0)) throw new Error("Qty harus lebih besar dari 0.");

  // Pastikan entri asal & tujuan ada (kalau belum ada → dibuat stok 0).
  const src = ensureLocalRow(from, category, keyFields);
  const dst = ensureLocalRow(to, category, keyFields);

  // Ambil nilai terkini
  let srcSistem = toNum(src.stokSistem);
  let srcFisik = toNum(src.stokFisik);
  let dstSistem = toNum(dst.stokSistem);
  let dstFisik = toNum(dst.stokFisik);

  // Validasi cukup stok kalau tidak boleh negatif
  if (!allowNegative) {
    if (mode === "fisik" && srcFisik < q)
      throw new Error(`Stok fisik di asal (${from}) tidak cukup.`);
    if (mode === "sistem" && srcSistem < q)
      throw new Error(`Stok sistem di asal (${from}) tidak cukup.`);
    if (mode === "both" && (srcFisik < q || srcSistem < q))
      throw new Error(`Stok asal (${from}) tidak cukup (fisik/sistem).`);
  }

  // Mutasi
  if (mode === "fisik") {
    srcFisik -= q;
    dstFisik += q;
    if (syncSystem) {
      srcSistem -= q;
      dstSistem += q;
    }
  } else if (mode === "sistem") {
    srcSistem -= q;
    dstSistem += q;
  } else if (mode === "both") {
    srcFisik -= q;
    dstFisik += q;
    srcSistem -= q;
    dstSistem += q;
  }

  // Simpan override baru
  upsertLocalOverride(from, category, {
    ...src,
    stokSistem: srcSistem,
    stokFisik: srcFisik,
    tanggal: TODAY,
  });
  upsertLocalOverride(to, category, {
    ...dst,
    stokSistem: dstSistem,
    stokFisik: dstFisik,
    tanggal: TODAY,
  });

  // Catat ledger
  const entry = {
    id: `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    from,
    to,
    category,
    key: makeKey(category, keyFields),
    keyFields,
    qty: q,
    mode,
    syncSystem: !!syncSystem,
    meta,
  };
  const ledger = getLedger();
  ledger.unshift(entry);
  setLedger(ledger);
  bumpVersion();

  return {
    ok: true,
    entry,
    after: {
      from: { stokSistem: srcSistem, stokFisik: srcFisik },
      to: { stokSistem: dstSistem, stokFisik: dstFisik },
    },
  };
}

/* ===================== API tambahan ===================== */

/** Ambil ledger (riwayat transfer), paling baru di awal */
export function readTransferLedger(limit) {
  const arr = getLedger();
  return typeof limit === "number" ? arr.slice(0, Math.max(0, limit)) : arr;
}

/** Hapus semua ledger */
export function clearTransferLedger() {
  setLedger([]);
  bumpVersion();
}

/** Listener untuk perubahan stok antar tab */
export function onStockChange(cb) {
  function handler(e) {
    if (e.key === VERSION_KEY) {
      try {
        cb && cb();
      } catch {}
    }
  }
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

/** Export ledger ke Excel */
export function exportTransferLedgerXlsx() {
  const rows = readTransferLedger().map((x) => ({
    WAKTU_ISO: x.ts,
    DARI: x.from,
    KE: x.to,
    KATEGORI: x.category,
    KEY: x.key,
    NAMA_BARANG: x.keyFields?.namaBarang || "",
    IMEI: x.keyFields?.imei || "",
    NO_DINAMO: x.keyFields?.noDinamo || "",
    QTY: x.qty,
    MODE: x.mode,
    SYNC_SYSTEM: x.syncSystem ? "YA" : "TIDAK",
    BY: x.meta?.by || "",
    CATATAN: x.meta?.note || "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "LEDGER_TRANSFER");
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  XLSX.writeFile(wb, `LEDGER_TRANSFER_${ymd}.xlsx`);
}

// src/data/StockTransfer.js
// Event sederhana untuk memberi tahu perubahan stok ke halaman lain.

const listeners = new Set();



export function emitStockChange() {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
}

/**
 * Contoh API transfer (silakan sesuaikan dgn struktur datamu):
 * Simpan transaksi transfer ke localStorage dan panggil emitStockChange().
 */
const LS_TRANSFERS = "stock_transfers";

export function getTransfers() {
  try { return JSON.parse(localStorage.getItem(LS_TRANSFERS)) || []; }
  catch { return []; }
}

export function addTransfer(payload) {
  const list = getTransfers();
  const id = list.length ? Math.max(...list.map(x => x.id || 0)) + 1 : 1;
  list.push({ id, ...payload, ts: new Date().toISOString() });
  localStorage.setItem(LS_TRANSFERS, JSON.stringify(list));
  emitStockChange();
}
