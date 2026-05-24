import { normalizeImei, normalizeText, isNonImei } from "./transferHelpers";

// ======================================
// 🔥 FINAL STOCK TRANSFER ENGINE
// ======================================

export const buildTransferStock = ({ transaksi = [], tokoPengirim = "" }) => {
  const imeiMap = {};
  const nonImeiMap = {};

  transaksi.forEach((trx) => {
    if (!trx) return;

    const toko = normalizeText(trx.NAMA_TOKO);

    if (toko !== normalizeText(tokoPengirim)) {
      return;
    }

    const metode = normalizeText(trx.PAYMENT_METODE);

    const imei = normalizeImei(trx.IMEI);

    // ======================================
    // 🔥 IMEI
    // ======================================
    if (!isNonImei(imei)) {
      if (["PEMBELIAN", "TRANSFER_MASUK", "REFUND"].includes(metode)) {
        imeiMap[imei] = {
          ...trx,
          qty: 1,
        };
      }

      if (["PENJUALAN"].includes(metode)) {
        delete imeiMap[imei];
      }

      return;
    }

    // ======================================
    // 🔥 NON IMEI
    // ======================================
    const skuKey = `${normalizeText(trx.NAMA_BRAND)}|${normalizeText(
      trx.NAMA_BARANG
    )}`;

    if (!nonImeiMap[skuKey]) {
      nonImeiMap[skuKey] = {
        ...trx,
        qty: 0,
      };
    }

    if (["PEMBELIAN", "TRANSFER_MASUK", "REFUND"].includes(metode)) {
      nonImeiMap[skuKey].qty += Number(trx.QTY || 0);
    }

    if (["PENJUALAN"].includes(metode)) {
      nonImeiMap[skuKey].qty -= Number(trx.QTY || 0);
    }
  });

  return {
    imeiStock: Object.values(imeiMap),

    nonImeiStock: Object.values(nonImeiMap),
  };
};
