// src/features/Reject/BarangReject.jsx

export const getRejectStatus = (trxList = []) => {
    
  let status = "AVAILABLE";
  let owner = null;

  

  trxList
    .sort((a, b) => (a.CREATED_AT || 0) - (b.CREATED_AT || 0))
    .forEach((trx) => {
      const metode = String(trx.PAYMENT_METODE || "").toUpperCase();

      switch (metode) {
        case "PEMBELIAN":
          status = "AVAILABLE";
          owner = trx.NAMA_TOKO;
          break;

        case "REFUND":
          status = "AVAILABLE";
          owner = trx.NAMA_TOKO;
          break;

        case "TRANSFER_KELUAR":
          status = "OUT";
          break;

        case "TRANSFER_MASUK":
          status = "AVAILABLE";
          owner = trx.NAMA_TOKO || trx.ke || trx.tokoTujuan;
          break;

        case "TRANSFER_REJECT":
          status = "AVAILABLE";
          owner = trx.NAMA_TOKO;
          break;

        case "PENJUALAN":
          status = "SOLD";
          break;

        default:
          break;
      }
    });

  return {
    status,
    owner,
    canTransfer: status === "AVAILABLE",

    canSell: status === "AVAILABLE",

    isSold: status === "SOLD",
  };
};

// ======================================
// 🔥 CEK PERNAH REJECT
// ======================================
export const hasTransferRejectHistory = (
    trxList = []
  ) => {
    return trxList.some(
      (trx) =>
        String(
          trx.PAYMENT_METODE || ""
        ).toUpperCase() ===
        "TRANSFER_REJECT"
    );
  };
