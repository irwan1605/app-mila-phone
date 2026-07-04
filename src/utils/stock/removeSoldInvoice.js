// ======================================================
// REMOVE NO_DO / NO_INVOICE BARANG YANG SUDAH TERJUAL
// ======================================================

const upper = (v) =>
  String(v || "")
      .trim()
      .toUpperCase();

export function removeSoldInvoice(
  rows = [],
  transaksi = []
) {

  //--------------------------------------------------
  // STATUS TERAKHIR IMEI
  //--------------------------------------------------

  const finalStatus = new Map();

  [...transaksi]
      .sort(
          (a, b) =>
              Number(a.CREATED_AT || a.createdAt || 0) -
              Number(b.CREATED_AT || b.createdAt || 0)
      )
      .forEach((trx) => {

          const imei = upper(trx.IMEI);

          if (!imei) return;

          finalStatus.set(imei, {
              metode: upper(trx.PAYMENT_METODE),
              status: upper(trx.STATUS)
          });

      });

  //--------------------------------------------------
  // FILTER BARANG TERJUAL
  //--------------------------------------------------

  const result = rows.filter((row) => {

      const imei = upper(row.imei);

      // NON IMEI tetap tampil
      if (!imei) return true;

      const last = finalStatus.get(imei);

      if (!last) return true;

      // Barang sudah terjual
      if (
          last.metode === "PENJUALAN" &&
          last.status === "APPROVED"
      ) {

          return false;

      }

      return true;

  });

  //--------------------------------------------------
  // HILANGKAN NO DO
  //--------------------------------------------------

  return result.map((row) => ({

      ...row,

      noDo: "",
      noDO: "",
      noInvoice: "",
      NO_DO: "",
      NO_INVOICE: "",
      invoice: ""

  }));

}