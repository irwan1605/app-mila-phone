const normalize = (v) =>
    String(v || "")
      .trim()
      .toUpperCase();

export const buildFinalImeiStock = ({ transaksi = [] }) => {
  const historyMap = {};

  transaksi.forEach((trx) => {
    const imei = String(trx.IMEI || "").trim();

    if (!imei) return;

    if (normalize(trx.STATUS) !== "APPROVED") {
      return;
    }

    if (!historyMap[imei]) {
      historyMap[imei] = [];
    }

    historyMap[imei].push(trx);
  });

  const result = {};

  Object.entries(historyMap).forEach(([imei, history]) => {
    const last = history.reduce((latest, trx) => {
        const latestTime =
          Number(latest?.CREATED_AT) ||
          Number(latest?.createdAt) ||
          Number(latest?.TIMESTAMP) ||
          0;
      
        const currentTime =
          Number(trx?.CREATED_AT) ||
          Number(trx?.createdAt) ||
          Number(trx?.TIMESTAMP) ||
          0;
      
        return currentTime > latestTime
          ? trx
          : latest;
      }, history[0]);

    const metode = normalize(last.PAYMENT_METODE);

    result[imei] = {
      imei,

      available: [
        "PEMBELIAN",
        "REFUND",
        "TRANSFER_MASUK",
        "TRANSFER_REJECT",
        "READY_RESALE",
        "REJECT",
        "RETUR"
      ].includes(metode),

      lastStatus: metode,

      toko: last.NAMA_TOKO || "",

      namaBarang: last.NAMA_BARANG || "",

      namaBrand: last.NAMA_BRAND || "",
    };
  });

  return result;
};
