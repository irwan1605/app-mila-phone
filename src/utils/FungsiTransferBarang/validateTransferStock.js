import { normalizeImei } from "./transferHelpers";

// ======================================
// 🔥 VALIDASI STOCK IMEI
// ======================================

export const validateTransferStock = ({ imeis = [], stock = [] }) => {
  imeis.forEach((imei) => {
    const found = stock.find(
      (s) => normalizeImei(s.IMEI) === normalizeImei(imei)
    );

    if (!found) {
      throw new Error(`❌ IMEI TIDAK TERSEDIA: ${imei}`);
    }
  });

  return true;
};

export function normalizeTransferTransactions(transaksi = []) {

  const rows = [];

  transaksi.forEach((trx)=>{

      if(Array.isArray(trx.imeis) && trx.imeis.length){

          trx.imeis.forEach((imei)=>{

              rows.push({

                  ...trx,

                  IMEI: imei

              });

          });

      }else{

          rows.push(trx);

      }

  });

  return rows;

}
