export const filterExportRows = ({ rows = [], transaksi = [] }) => {
  const soldSet = new Set();

  const sorted = [...transaksi].sort(
    (a, b) =>
      new Date(a.CREATED_AT || a.TANGGAL_TRANSAKSI || 0).getTime() -
      new Date(b.CREATED_AT || b.TANGGAL_TRANSAKSI || 0).getTime()
  );

  sorted.forEach((t) => {
    if (!t?.IMEI) return;

    const imei = String(t.IMEI).trim().toUpperCase();

    const metode = String(t.PAYMENT_METODE || "").toUpperCase();

    const status = String(t.STATUS || "").toUpperCase();

    if (!["APPROVED", "REFUND"].includes(status)) {
      return;
    }

    // keluar stock
    if (["PENJUALAN", "REJECT", "STOK OPNAME"].includes(metode)) {
      soldSet.add(imei);
    }

    // masuk lagi
    if (["REFUND", "TRANSFER_REJECT", "VOID OPNAME"].includes(metode)) {
      soldSet.delete(imei);
    }
  });

  return rows.filter((r) => {
    const imei = String(r.imei || "")
      .trim()
      .toUpperCase();

    // NON IMEI
    if (!imei) {
      return Number(r.qty || 0) > 0;
    }

    if (soldSet.has(imei)) {
      return false;
    }

    return Number(r.qty || 0) > 0;
  });
};
