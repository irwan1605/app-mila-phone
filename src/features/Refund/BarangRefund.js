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

    const qty = Math.abs(Number(t.QTY || 0));

    const isTransferMasuk = metode === "TRANSFER_MASUK";

    const isTransferKeluar = metode === "TRANSFER_KELUAR";

    const isRetur = metode === "RETUR";

    const isRejectTransfer = metode === "TRANSFER_REJECT";

    // ======================
    // IMEI
    // ======================
    // ======================
    // IMEI NORMAL
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
    // PENJUALAN DARI items[].imeiList
    // ======================
    if (metode === "PENJUALAN" && Array.isArray(t.items)) {
      t.items.forEach((item) => {
        (item.imeiList || []).forEach((imei) => {
          const key = normalizeImei(imei);

          if (tracker[key]?.hasRefund) {
            tracker[key].soldAfterRefund = true;
          }
          console.log("REFUND SOLD DETECTED", key);
        });
      });

      return;
    }

    // ======================
    // NON IMEI
    // ======================
    const tokoAktif =
    t.OWNER_AKHIR ||
    t.TOKO_PENERIMA ||
    t.TOKO_TUJUAN ||
    t.NAMA_TOKO ||
    "-";

const skuKey =
    `${normalizeText(tokoAktif)}|` +
    `${normalizeText(t.NAMA_BRAND)}|` +
    `${normalizeText(t.NAMA_BARANG)}`;

    if (!tracker[skuKey]) {
      tracker[skuKey] = {
        refundQty: 0,
        soldQty: 0,
        saldo: 0,
        lastStatus: "",
    };
    }

    // ======================================
    // DETEKSI SEMUA TIPE REFUND
    // ======================================
    // ======================================
    // DETEKSI REFUND
    // ======================================

    const isRefund =
      metode === "REFUND" ||
      t.IS_REFUND === true ||
      String(t.statusPembayaran || "").toUpperCase() === "REFUND";

    // ======================================
    // REFUND / RETUR
    // ======================================

    if (isRefund || isRetur) {
      tracker[skuKey].refundQty += qty;
      tracker[skuKey].saldo += qty;
      tracker[skuKey].lastStatus = "REFUND";
    }

    // ======================================
    // TRANSFER MASUK
    // ======================================
    else if (isTransferMasuk) {
      // Transfer masuk bukan penjualan.
      // Jangan ubah refundQty.
      // Jangan ubah soldQty.
    }

    // ======================================
    // TRANSFER KELUAR
    // ======================================
    else if (isTransferKeluar) {
      // Transfer keluar hanya perpindahan toko.
      // Jangan ubah refundQty.
      // Jangan ubah soldQty.
    }

    // ======================================
    // TRANSFER REJECT
    // ======================================
    else if (isRejectTransfer) {
      // Barang reject kembali menjadi stok.
      // Tidak dianggap penjualan.
    }

    // ======================================
    // PENJUALAN
    // ======================================
    else if (metode === "PENJUALAN") {
      tracker[skuKey].soldQty += qty;
      tracker[skuKey].saldo -= qty;
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

      if (!data) {
        return true;
      }

      // REFUND -> PENJUALAN
      if (data.hasRefund === true && data.soldAfterRefund === true) {
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

    const isRefundRow =
    ket.includes("REFUND") ||
    ket.includes("RETUR");

    if (!isRefundRow) {
      return true;
    }

    if (!data) {
      return true;
    }

    const saldo = Number(data.saldo || 0);

    if (saldo <= 0) {
        return false;
    }

    // ======================================================
    // JANGAN UBAH row.qty
    // Qty sudah dihitung oleh PASS 2 (stockByStore)
    // ======================================================

    return true;
  });
};

export const buildRefundSoldSet = (transaksi = []) => {
  const tracker = buildRefundSoldTracker(transaksi);

  const set = new Set();

  Object.entries(tracker).forEach(([imei, data]) => {
    if (data?.hasRefund && data?.soldAfterRefund) {
      set.add(imei);
    }
  });

  console.log("REFUND SOLD SET", Array.from(set));

  return set;
};

export const isRefundSoldImei = (imei, transaksi = []) => {
  const tracker = buildRefundSoldTracker(transaksi);

  const key = normalizeImei(imei);

  return Boolean(tracker?.[key]?.hasRefund && tracker?.[key]?.soldAfterRefund);
};
