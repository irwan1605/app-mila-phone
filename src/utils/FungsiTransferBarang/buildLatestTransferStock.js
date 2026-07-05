export const buildLatestTransferStock = ({
    transaksi = [],
    namaToko = "",
    masterMap = {},
    supplierLookup = {}
}) => {

    const normalize = (v) =>
        String(v || "").trim().toUpperCase();

    const normalizeImei = (v) =>
        String(v || "")
            .trim()
            .replace(/\s+/g, "")
            .toUpperCase();

    const ownerMap = {};

    const sorted = [...transaksi].sort(
        (a,b)=>
            new Date(a.CREATED_AT||0)-
            new Date(b.CREATED_AT||0)
    );

    sorted.forEach(trx=>{

        if(!trx.IMEI) return;

        if(String(trx.STATUS).toUpperCase()!=="APPROVED")
            return;

        const imei=normalizeImei(trx.IMEI);

        const metode=String(
            trx.PAYMENT_METODE
        ).toUpperCase();

        switch(metode){

            case "PEMBELIAN":
            case "REFUND":
            case "TRANSFER_REJECT":
            case "VOID OPNAME":

                ownerMap[imei]={
                    active:true,
                    trx
                };

                break;

            case "TRANSFER_KELUAR":

                ownerMap[imei]={
                    active:true,
                    trx:{
                        ...trx,
                        NAMA_TOKO:
                            trx.TOKO_TUJUAN ||
                            trx.ke ||
                            trx.tokoTujuan ||
                            trx.tokoPenerima
                    }
                };

                break;

            case "TRANSFER_MASUK":

                ownerMap[imei]={
                    active:true,
                    trx:{
                        ...trx,
                        NAMA_TOKO:
                            trx.TOKO_TUJUAN ||
                            trx.ke ||
                            trx.tokoTujuan ||
                            trx.tokoPenerima
                    }
                };

                break;

            case "PENJUALAN":

                ownerMap[imei]={
                    active:false
                };

                break;

        }

    });

    return Object.values(ownerMap)
        .filter(x=>x.active)
        .filter(x=>
            normalize(x.trx.NAMA_TOKO)===normalize(namaToko)
        )
        .map(({trx})=>({

            tanggal:trx.TANGGAL_TRANSAKSI,

            noDo:trx.NO_SURAT_JALAN||trx.NO_INVOICE,

            supplier:
                trx.NAMA_SUPPLIER||
                supplierLookup[normalizeImei(trx.IMEI)]||
                "ONLINE NON PKP",

            namaToko:trx.NAMA_TOKO,

            brand:trx.NAMA_BRAND,

            barang:trx.NAMA_BARANG,

            imei:trx.IMEI,

            qty:1,

            hargaSRP:
                masterMap[
                    `${trx.NAMA_BRAND}|${trx.NAMA_BARANG}`
                ]?.hargaSRP||0,

            hargaGrosir:
                masterMap[
                    `${trx.NAMA_BRAND}|${trx.NAMA_BARANG}`
                ]?.hargaGrosir||0,

            hargaReseller:
                masterMap[
                    `${trx.NAMA_BRAND}|${trx.NAMA_BARANG}`
                ]?.hargaReseller||0,

            statusBarang:"TERSEDIA",

            sumberStock:"TRANSFER",

            keterangan:"TRANSFER BARANG",

            latestTransfer:true

        }));

};