import { sortStockTransactions } from "../../../utils/stock/stockTransactionOrder";

const normalizeImei = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

export const buildFinalImeiStockOpname = ({ transaksi = [] }) => {
  const map = {};

  const sorted = sortStockTransactions(transaksi);

  sorted.forEach((t) => {
    if (!t?.IMEI) return;

    const status = String(t.STATUS || "").toUpperCase();

    if (!["APPROVED", "REFUND"].includes(status)) {
      return;
    }

    const imei = normalizeImei(t.IMEI);

    const metode = String(t.PAYMENT_METODE || "").toUpperCase();

    // =====================
    // STOCK MASUK
    // =====================
    if (
      [
        "PEMBELIAN",
        "TRANSFER_MASUK",
        "REFUND",
        "TRANSFER_REJECT",
        "VOID OPNAME",
      ].includes(metode)
    ) {
      map[imei] = {
        imei,
        active: true,
        metode,
      };

      return;
    }

    // =====================
    // STOCK KELUAR FINAL
    // =====================
    if (["PENJUALAN", "REJECT", "STOK OPNAME"].includes(metode)) {
      delete map[imei];
    }
  });

  return new Set(Object.keys(map));
};
