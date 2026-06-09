export const validateFinalImeiSale = (imei, transaksi = []) => {
  const history = transaksi
    .filter(
      (trx) => String(trx.IMEI || "").trim() === String(imei || "").trim()
    )
    .sort((a, b) => (a.CREATED_AT || 0) - (b.CREATED_AT || 0));

  if (!history.length) {
    return {
      canSell: true,
      reason: "NO_HISTORY",
    };
  }

  const last = history[history.length - 1];

  const metode = String(last.PAYMENT_METODE || "").toUpperCase();

  // ==========================
  // BOLEH DIJUAL
  // ==========================
  if (
    [
      "PEMBELIAN",
      "REFUND",
      "TRANSFER_MASUK",
      "TRANSFER_REJECT",
      "READY_RESALE",
    ].includes(metode)
  ) {
    return {
      canSell: true,
      reason: metode,
    };
  }

  // ==========================
  // TIDAK BOLEH DIJUAL
  // ==========================
  if (["PENJUALAN", "TRANSFER_KELUAR"].includes(metode)) {
    return {
      canSell: false,
      reason: metode,
    };
  }

  return {
    canSell: false,
    reason: "UNKNOWN",
  };
};
