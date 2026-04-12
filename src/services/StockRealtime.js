import { ref, onValue } from "firebase/database";
import { db } from "./FirebaseInit";

export const listenStockRealtime = (tokoId, callback) => {
  const r = ref(db, `toko/${tokoId}/transaksi`);

  return onValue(r, (snap) => {
    const data = snap.val() || {};

    const map = {};

    Object.values(data).forEach((trx) => {
      if (trx.STATUS !== "Approved") return;

      const key = `${trx.NAMA_BRAND}|${trx.NAMA_BARANG}`;

      if (!map[key]) {
        map[key] = 0;
      }

      // 🔥 MASUK
      if (
        ["PEMBELIAN", "TRANSFER_MASUK", "REFUND"].includes(
          trx.PAYMENT_METODE
        )
      ) {
        map[key] += Number(trx.QTY || 1);
      }

      // 🔥 KELUAR
      if (
        ["PENJUALAN", "TRANSFER_KELUAR"].includes(
          trx.PAYMENT_METODE
        )
      ) {
        map[key] -= Number(trx.QTY || 1);
      }
    });

    callback(map);
  });
};