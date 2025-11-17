// frontend/src/pages/helpers/dashboardShim.js
import db from "../../data/database.js";

export const TOKO_LABELS = {
  "GAS ALAM": "TOKO GAS ALAM",
  "PERMATA": "TOKO PERMATA",
  "PUSAT": "TOKO PUSAT",
};

export const PAYMENT_METHODS = ["Cash", "Transfer", "Debit", "E-Wallet", "Leasing / Kredit"];

export const toNum = (v) => {
  if (typeof v === "number") return v || 0;
  if (typeof v === "string") {
    const clean = v.replace(/[^\d.-]/g, "");
    const n = Number(clean);
    return isFinite(n) ? n : 0;
  }
  return 0;
};

export const formatCurrency = (n) => "Rp " + (toNum(n) || 0).toLocaleString("id-ID");

export function getMdrByMethod(method) {
  const key = (method || "").toLowerCase();
  const rules = {
    cash: 0,
    transfer: 0,
    debit: 0.7,
    "e-wallet": 1.5,
    kredit: 2.1,
    "leasing / kredit": 2.1,
  };
  return rules[key] ?? 0;
}

export function getBungaByTenor(tenor) {
  const t = Number(tenor) || 0;
  if (t <= 3) return 1.5;
  if (t <= 6) return 2.5;
  if (t <= 12) return 4.5;
  return 6.5;
}

export function computeFinancials(row) {
  const base = toNum(row.Penjualan);
  const dp = toNum(row.DP);
  const tenor = toNum(row.Tenor);
  const bungaRate = getBungaByTenor(tenor);
  const mdrPct = getMdrByMethod(row.Payment || "Cash");
  const mdrFee = (base * mdrPct) / 100;
  const totalBunga = (base - dp) * (bungaRate / 100);
  const grandTotal = base + totalBunga;
  const cicilan = tenor > 0 ? (grandTotal - dp) / tenor : 0;

  return { base, dp, tenor, bungaRate, mdrPct, mdrFee, totalBunga, grandTotal, cicilan };
}

export function getAllToko() {
  return Object.keys(db);
}

export function getDataByToko(toko) {
  const data = db[toko] || [];
  return data.map((r) => ({
    ...r,
    Penjualan: toNum(r.Penjualan),
    Qty: toNum(r.Qty),
    "Jumlah Bayar ": toNum(r["Jumlah Bayar "]),
  }));
}

export function getSummaryByToko(toko) {
  const data = getDataByToko(toko);
  const totalQty = data.reduce((a, b) => a + toNum(b.Qty), 0);
  const totalOmzet = data.reduce((a, b) => a + toNum(b.Penjualan), 0);
  const totalTransaksi = data.length;
  return { totalQty, totalOmzet, totalTransaksi };
}

export function getSummaryAllToko() {
  return Object.keys(db).map((key) => ({
    nama: TOKO_LABELS[key] || key,
    ...getSummaryByToko(key),
  }));
}

export function getDailyTrend(toko) {
  const data = getDataByToko(toko);
  const group = {};
  data.forEach((r) => {
    const tgl = r.Tanggal || "Tidak diketahui";
    if (!group[tgl])
      group[tgl] = { Tanggal: tgl, totalOmzet: 0, totalTransaksi: 0 };
    group[tgl].totalOmzet += toNum(r.Penjualan);
    group[tgl].totalTransaksi += 1;
  });
  return Object.values(group).sort(
    (a, b) => new Date(a.Tanggal) - new Date(b.Tanggal)
  );
}
