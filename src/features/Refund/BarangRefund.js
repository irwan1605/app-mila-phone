// src/features/Refund/BarangRefund.js

const normalizeImei = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const normalizeText = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

const buildRefundSoldTracker = (transaksi = []) => {
  const tracker = {};

  const sorted = [...transaksi].sort(
    (a, b) =>
      new Date(a.CREATED_AT || a.TANGGAL_TRANSAKSI || 0).getTime() -
      new Date(b.CREATED_AT || b.TANGGAL_TRANSAKSI || 0).getTime()
  );

  sorted.forEach((t) => {
    const status = String(t.STATUS || "").toUpperCase();

    if (!["APPROVED", "REFUND"].includes(status)) {
      return;
    }

    const metode = String(t.PAYMENT_METODE || "").toUpperCase();

    // ======================
    // IMEI
    // ======================
    if (t.IMEI) {
      const key = normalizeImei(t.IMEI);

      if (!tracker[key]) {
        tracker[key] = {
          hasRefund: false,
          soldAfterRefund: false,
        };
      }

      if (metode === "REFUND") {
        tracker[key].hasRefund = true;
      }

      if (metode === "PENJUALAN" && tracker[key].hasRefund) {
        tracker[key].soldAfterRefund = true;
      }

      return;
    }

    // ======================
    // NON IMEI
    // ======================
    const skuKey =
      `${normalizeText(t.NAMA_TOKO)}|` +
      `${normalizeText(t.NAMA_BRAND)}|` +
      `${normalizeText(t.NAMA_BARANG)}`;

    if (!tracker[skuKey]) {
      tracker[skuKey] = {
        refundQty: 0,
        soldQty: 0,
      };
    }

    if (metode === "REFUND") {
      tracker[skuKey].refundQty += Number(t.QTY || 0);
    }

    if (metode === "PENJUALAN") {
      tracker[skuKey].soldQty += Number(t.QTY || 0);
    
      if (tracker[skuKey].refundQty > 0) {
        tracker[skuKey].lastStatus = "REFUND";
      }
    }
  });

  return tracker;
};

export const filterRefundSoldRows = ({ rows = [], transaksi = [] }) => {
  const tracker = buildRefundSoldTracker(transaksi);

  return rows.filter((row) => {
    // ==========================
    // IMEI
    // ==========================

    if (row.imei) {
      const key = normalizeImei(row.imei);

      const data = tracker[key];

      if (data?.hasRefund && data?.soldAfterRefund) {
        return false;
      }

      return true;
    }

    // ==========================
    // NON IMEI
    // ==========================
    const skuKey =
      `${normalizeText(row.namaToko)}|` +
      `${normalizeText(row.brand)}|` +
      `${normalizeText(row.barang)}`;

    const data = tracker[skuKey];

    const ket = String(row.keterangan || row.statusBarang || "").toUpperCase();

    const isRefundRow = ket.includes("REFUND");

    if (!isRefundRow) {
      return true;
    }

    if (!data) {
      return true;
    }

    const refundQty = Number(data.refundQty || 0);

    const soldQty = Number(data.soldQty || 0);

    const sisaRefund = refundQty - soldQty;

    // =====================================
    // REFUND HABIS TERJUAL
    // =====================================
    if (sisaRefund <= 0) {
      return false;
    }

    // =====================================
    // JANGAN TAMPILKAN QTY LEBIH BESAR
    // DARI SISA REFUND
    // =====================================
    row.qty = Math.min(Number(row.qty || 0), sisaRefund);

    if (
      data?.lastStatus === "REFUND" &&
      String(row.keterangan || "").toUpperCase() === "PENJUALAN"
    ) {
      row.keterangan = "REFUND";
    }

    return row.qty > 0;
  });
};

export const buildRefundSoldSet = (transaksi = []) => {
  const tracker = buildRefundSoldTracker(transaksi);

  const soldSet = new Set();

  Object.entries(tracker).forEach(([key, val]) => {
    if (val?.hasRefund && val?.soldAfterRefund) {
      soldSet.add(key);
    }
  });

  return soldSet;
};

export const isRefundSoldImei = (
  imei,
  transaksi = []
) => {
  const tracker = buildRefundSoldTracker(transaksi);

  const key = normalizeImei(imei);

  return Boolean(
    tracker?.[key]?.hasRefund &&
      tracker?.[key]?.soldAfterRefund
  );
};


