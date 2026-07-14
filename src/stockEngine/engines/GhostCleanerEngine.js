// ==========================================================
// src/stockEngine/engines/GhostCleanerEngine.js
// ==========================================================

import { normalize, normalizeImei, normalizeText } from "../helpers/normalize";

import { createSkuKey } from "../helpers/createKey";

import { STATUS } from "../constants/stockConstant";

// ==========================================================

export function GhostCleanerEngine({
  stock = {},

  ownership = {},

  state = {},

  currentStore = "",

  refundSoldSet = new Set(),

  rejectSoldSet = new Set(),
} = {}) {
  const cleanMap = {};

  const imeiSet = new Set();

  const skuSet = new Set();

  Object.values(stock).forEach((item) => {
    if (!item) return;

    const owner = ownership[item.key];

    const itemState = state[item.key];

    //----------------------------------------------------
    // OWNER SALAH
    //----------------------------------------------------

    if (currentStore && normalize(owner?.owner) !== normalize(currentStore))
      return;

    //----------------------------------------------------
    // DELETED
    //----------------------------------------------------

    if (itemState?.deleted) return;

    //----------------------------------------------------
    // QTY MINUS
    //----------------------------------------------------

    if (Number(item.qty) < 0) return;

    //----------------------------------------------------
    // QTY NOL
    //----------------------------------------------------

    if (Number(item.qty) === 0) return;

    //----------------------------------------------------
    // SOLD
    //----------------------------------------------------

    if (itemState?.status === STATUS.SOLD) return;

    //----------------------------------------------------
    // REJECT
    //----------------------------------------------------

    if (itemState?.status === STATUS.REJECT) return;

    //----------------------------------------------------
    // STOCK OPNAME
    //----------------------------------------------------

    if (itemState?.status === STATUS.OPNAME) return;

    //----------------------------------------------------
    // REFUND SUDAH TERJUAL
    //----------------------------------------------------

    if (refundSoldSet.has(item.key)) return;

    //----------------------------------------------------
    // REJECT SUDAH TERJUAL
    //----------------------------------------------------

    if (rejectSoldSet.has(item.key)) return;

    //----------------------------------------------------
    // IMEI
    //----------------------------------------------------

    if (item.imei) {
      const imei = normalizeImei(item.imei);

      if (imeiSet.has(imei)) return;

      imeiSet.add(imei);
    }

    //----------------------------------------------------
    // NON IMEI
    //----------------------------------------------------
    else {
      const sku = createSkuKey({
        toko: item.owner,

        brand: item.brand,

        barang: item.barang,
      });

      if (skuSet.has(sku)) {
        cleanMap[sku].qty += Number(item.qty || 0);

        return;
      }

      skuSet.add(sku);
    }

    //----------------------------------------------------
    // OWNER KOSONG
    //----------------------------------------------------

    if (!item.owner) return;

    //----------------------------------------------------
    // BARANG KOSONG
    //----------------------------------------------------

    if (!normalizeText(item.barang)) return;

    //----------------------------------------------------
    // BRAND KOSONG
    //----------------------------------------------------

    if (!normalizeText(item.brand)) return;

    //----------------------------------------------------
    // SIMPAN
    //----------------------------------------------------

    cleanMap[item.key] = {
      ...item,

      owner: item.owner,

      state: itemState?.status,
    };
  });

  return cleanMap;
}
