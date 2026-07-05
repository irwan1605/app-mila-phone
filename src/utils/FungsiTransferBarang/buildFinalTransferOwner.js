// ===========================================================
// buildFinalTransferOwner.js
// SINGLE SOURCE OF TRUTH
// OWNER TERAKHIR IMEI
// ===========================================================

const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

const normalizeImei = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

export function buildFinalTransferOwner(transaksi = []) {
  const ownerMap = {};

  const sorted = [...transaksi].sort((a, b) => {
    const ta = new Date(
      a.TANGGAL_TRANSAKSI || a.CREATED_AT || a.createdAt || 0
    ).getTime();

    const tb = new Date(
      b.TANGGAL_TRANSAKSI || b.CREATED_AT || b.createdAt || 0
    ).getTime();

    return ta - tb;
  });

  sorted.forEach((trx) => {
    const status = String(trx.STATUS || "").toUpperCase();

    if (status !== "APPROVED" && status !== "REFUND") return;

    //--------------------------------------------------
    // SUPPORT IMEI DAN imeis[]
    //--------------------------------------------------

    const imeiList = [];

    if (trx.IMEI) imeiList.push(trx.IMEI);

    if (Array.isArray(trx.imeis)) imeiList.push(...trx.imeis);

    imeiList.forEach((rawImei) => {
      const imei = normalizeImei(rawImei);

      if (!imei) return;

      const metode = String(trx.PAYMENT_METODE || "").toUpperCase();

      const tokoAsal = normalize(
        trx.OWNER_SEBELUM || trx.dari || trx.tokoPengirim || trx.NAMA_TOKO
      );

      const tokoTujuan = normalize(
        trx.OWNER_AKHIR ||
          trx.ke ||
          trx.TOKO_TUJUAN ||
          trx.tokoTujuan ||
          trx.tokoPenerima ||
          trx.NAMA_TOKO
      );

      switch (metode) {
        case "PEMBELIAN":
        case "TRANSFER_MASUK":
        case "TRANSFER_KELUAR":
        case "TRANSFER_REJECT":
        case "REFUND":
        case "VOID OPNAME":
          // falls through

          ownerMap[imei] = {
            imei,

            toko: tokoTujuan,

            active: true,

            metode,

            tanggal: trx.TANGGAL_TRANSAKSI || trx.CREATED_AT || trx.createdAt,

            transaksi: trx,

            brand: trx.NAMA_BRAND,

            barang: trx.NAMA_BARANG,

            supplier: trx.NAMA_SUPPLIER,

            invoice: trx.NO_SURAT_JALAN || trx.NO_INVOICE,

            history: [
              ...(ownerMap[imei]?.history || []),
              {
                dari: tokoAsal,
                ke: tokoTujuan,
                tanggal: trx.TANGGAL_TRANSAKSI,
                invoice: trx.NO_SURAT_JALAN || trx.NO_INVOICE,
                metode,
              },
            ],
          };

          break;

        case "PENJUALAN":
        case "REJECT":
        case "STOK OPNAME":
          // falls through

          ownerMap[imei] = {
            imei,
            toko: tokoAsal,
            active: false,
            metode,
            tanggal: trx.TANGGAL_TRANSAKSI || trx.CREATED_AT || trx.createdAt,
            transaksi: trx,
          };

          break;

        default:
          break;
      }
    });
  });

  return ownerMap;
}
