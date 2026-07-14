// ======================================================
// src/stockEngine/selectors/selectExcelExport.js
// ======================================================

export function selectExcelExport(validation) {
  return validation.rows.map((r) => ({
    NO_DO: r.noDo,

    TOKO: r.owner,

    SUPPLIER: r.supplier,

    BRAND: r.brand,

    BARANG: r.barang,

    IMEI: r.imei,

    QTY: r.qty,

    STATUS: r.statusBarang,

    SRP: r.hargaSRP,

    GROSIR: r.hargaGrosir,

    RESELLER: r.hargaReseller,
  }));
}
