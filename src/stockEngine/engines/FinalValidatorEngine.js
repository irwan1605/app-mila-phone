// ==========================================================
// src/stockEngine/engines/FinalValidatorEngine.js
// ==========================================================

import { STATUS } from "../constants/stockConstant";

import { normalize, normalizeText, normalizeImei } from "../helpers/normalize";

import { createSkuKey } from "../helpers/createKey";

// ==========================================================

export function FinalValidatorEngine({ stock = {} } = {}) {
  const imeiSet = new Set();

  const skuSet = new Set();

  const rows = [];

  Object.values(stock).forEach((item) => {
    if (!item) return;

    //-------------------------------------------------
    // OWNER
    //-------------------------------------------------

    if (!normalize(item.owner)) return;

    //-------------------------------------------------
    // BRAND
    //-------------------------------------------------

    if (!normalizeText(item.brand)) return;

    //-------------------------------------------------
    // BARANG
    //-------------------------------------------------

    if (!normalizeText(item.barang)) return;

    //-------------------------------------------------
    // SUPPLIER
    //-------------------------------------------------

    item.supplier = normalizeText(item.supplier) || "ONLINE NON PKP";

    //-------------------------------------------------
    // QTY
    //-------------------------------------------------

    if (Number(item.qty) <= 0) return;

    //-------------------------------------------------
    // HARGA
    //-------------------------------------------------

    item.hargaSRP = Math.max(
      0,

      Number(item.hargaSRP || 0)
    );

    item.hargaGrosir = Math.max(
      0,

      Number(item.hargaGrosir || 0)
    );

    item.hargaReseller = Math.max(
      0,

      Number(item.hargaReseller || 0)
    );

    //-------------------------------------------------
    // STATE
    //-------------------------------------------------

    if (
      !Object.values(STATUS)
      .includes(item.state)
    ) {
      item.state = STATUS.ACTIVE;
    }

    //-------------------------------------------------
    // IMEI
    //-------------------------------------------------

    if (item.imei) {
      const key = normalizeImei(item.imei);

      if (imeiSet.has(key)) return;

      imeiSet.add(key);
    }

    //-------------------------------------------------
    // SKU
    //-------------------------------------------------
    else {
      const sku = createSkuKey({
        toko: item.owner,

        brand: item.brand,

        barang: item.barang,
      });

      if (skuSet.has(sku)) return;

      skuSet.add(sku);
    }

    //-------------------------------------------------
    // TANGGAL
    //-------------------------------------------------

    item.tanggal = item.tanggal || "-";

    //-------------------------------------------------
    // STATUS BARANG
    //-------------------------------------------------

    item.statusBarang = item.qty > 0 ? "TERSEDIA" : "KOSONG";

    //-------------------------------------------------
    // PUSH
    //-------------------------------------------------

    rows.push({
      ...item,
    });
  });

  //-----------------------------------------------------
  // SORT FINAL
  //-----------------------------------------------------

  rows.sort((a, b) => {
    if (a.owner !== b.owner) {
      return a.owner.localeCompare(b.owner);
    }

    if (a.brand !== b.brand) {
      return a.brand.localeCompare(b.brand);
    }

    if (a.barang !== b.barang) {
      return a.barang.localeCompare(b.barang);
    }

    return (a.imei || "").localeCompare(b.imei || "");
  });

  return rows;
}
