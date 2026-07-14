// ==============================================
// src/stockEngine/helpers/createKey.js
// ==============================================

import { normalize, normalizeText, normalizeImei } from "./normalize";

export const createImeiKey = (imei) => normalizeImei(imei);

export const createSkuKey = ({
  toko,

  brand,

  barang,
}) => [normalize(toko), normalizeText(brand), normalizeText(barang)].join("|");

export const createMasterKey = ({
  brand,

  barang,
}) => [normalizeText(brand), normalizeText(barang)].join("|");

export const createSupplierKey = ({
  toko,

  supplier,

  brand,

  barang,
}) =>
  [
    normalize(toko),

    normalizeText(supplier),

    normalizeText(brand),

    normalizeText(barang),
  ].join("|");
