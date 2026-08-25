const normalize = (value) => String(value || "").trim().toUpperCase();

const eventTime = (row = {}) => {
  const raw =
    row.CREATED_AT || row.createdAt || row.APPROVED_AT || row.approvedAt ||
    row.TANGGAL_TRANSAKSI || 0;
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

// Approve menulis KELUAR dan MASUK pada milidetik yang sama. MASUK harus
// diproses terakhir agar toko tujuan menjadi owner final secara deterministik.
const eventPriority = (row = {}) => {
  const method = normalize(row.PAYMENT_METODE);
  if (method === "TRANSFER_KELUAR") return 10;
  if (method === "TRANSFER_MASUK") return 20;
  return 30;
};

export const sortStockTransactions = (rows = []) =>
  [...rows].sort((a, b) => {
    const byTime = eventTime(a) - eventTime(b);
    if (byTime !== 0) return byTime;
    const byEvent = eventPriority(a) - eventPriority(b);
    if (byEvent !== 0) return byEvent;
    return String(a.id || a.trxKey || "").localeCompare(
      String(b.id || b.trxKey || "")
    );
  });

export const buildFinalImeiOwnerTracker = (rows = [], normalizeImei) => {
  const owners = {};

  sortStockTransactions(rows).forEach((row) => {
    if (!row?.IMEI) return;
    const status = normalize(row.STATUS || row.status);
    if (!["APPROVED", "APPROVE", "REFUND"].includes(status)) return;
    const imei = normalizeImei(row.IMEI);
    if (!imei) return;
    const method = normalize(row.PAYMENT_METODE);

    if (["PEMBELIAN", "TRANSFER_MASUK", "REFUND", "RETUR",
      "TRANSFER_REJECT", "VOID OPNAME"].includes(method)) {
      owners[imei] = {
        toko: row.OWNER_AKHIR || row.CURRENT_OWNER || row.NAMA_TOKO ||
          row.ke || row.tokoTujuan || "-",
        active: true,
        metode: method,
        transferId: row.TRANSFER_ID || "",
      };
      return;
    }

    if (method === "TRANSFER_KELUAR") {
      owners[imei] = {
        toko: row.OWNER_AKHIR || row.CURRENT_OWNER || row.TOKO_TUJUAN ||
          row.TOKO_PENERIMA || row.tokoPenerima || row.tokoTujuan || row.ke ||
          row.NAMA_TOKO || "-",
        active: true,
        metode: method,
        transferId: row.TRANSFER_ID || "",
      };
      return;
    }

    if (["PENJUALAN", "REJECT", "STOK OPNAME"].includes(method)) {
      owners[imei] = {
        toko: row.NAMA_TOKO || "-",
        active: false,
        metode: method,
      };
    }
  });

  return owners;
};
