// src/utils/RemoveSoldItemsInsideInvoice.js

const U = (v = "") => String(v).trim().toUpperCase();

export function RemoveSoldItemsInsideInvoice({
    rows = [],
    transaksi = [],
}) {

    //--------------------------------------------------
    // Cari seluruh barang yang SUDAH TERJUAL
    //--------------------------------------------------

    const soldKey = new Set();

    transaksi.forEach((trx) => {

        if (U(trx.STATUS) !== "APPROVED")
            return;

        if (U(trx.PAYMENT_METODE) !== "PENJUALAN")
            return;

        soldKey.add(
            [
                U(trx.NO_INVOICE),
                U(trx.NAMA_BRAND),
                U(trx.NAMA_BARANG),
                U(trx.IMEI),
            ].join("|")
        );
    });

    //--------------------------------------------------
    // Filter table
    //--------------------------------------------------

    return rows.filter((row) => {

        const key = [
            U(
                row.noInvoice ||
                row.NO_INVOICE ||
                row.invoice ||
                row.noDo
            ),
            U(row.brand),
            U(row.barang),
            U(row.imei),
        ].join("|");

        return !soldKey.has(key);
    });

}