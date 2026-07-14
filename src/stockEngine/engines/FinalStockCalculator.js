// ===========================================================
// src/stockEngine/engines/FinalStockCalculator.js
// ===========================================================

import { STOCK_IN, STOCK_OUT } from "../constants/stockConstant";

import {
  normalize,
  normalizeNumber,
  normalizeImei,
} from "../helpers/normalize";

import { createImeiKey, createSkuKey } from "../helpers/createKey";

import { sortTransaction } from "../helpers/sortTransaction";

// ===========================================================
// ENGINE
// ===========================================================

export function FinalStockCalculator({
  transaksi = [],

  ownership = {},

  state = {},

  masterMap = {},

  supplierLookup = {},
} = {}) {
  const stockMap = {};

  const rows = sortTransaction(transaksi);

  rows.forEach((trx) => {
    const metode = normalize(trx.PAYMENT_METODE);

    const isImei = normalizeImei(trx.IMEI) !== "";

    const key = isImei
      ? createImeiKey(trx.IMEI)
      : createSkuKey({
          toko:
            ownership[
              isImei
                ? createImeiKey(trx.IMEI)
                : createSkuKey({
                    toko: trx.NAMA_TOKO,

                    brand: trx.NAMA_BRAND,

                    barang: trx.NAMA_BARANG,
                  })
            ]?.owner || trx.NAMA_TOKO,

          brand: trx.NAMA_BRAND,

          barang: trx.NAMA_BARANG,
        });

    if (!stockMap[key]) {
      stockMap[key] = {
        key,

        owner: ownership[key]?.owner || trx.NAMA_TOKO || "",

        imei: isImei ? trx.IMEI : "",

        brand: trx.NAMA_BRAND || "",

        barang: trx.NAMA_BARANG || "",

        supplier: trx.NAMA_SUPPLIER || supplierLookup[key] || "",

        tanggal: trx.TANGGAL_TRANSAKSI || "",

        qty: 0,

        hargaSRP:
          masterMap[`${trx.NAMA_BRAND}|${trx.NAMA_BARANG}`]?.hargaSRP || 0,

        hargaGrosir:
          masterMap[`${trx.NAMA_BRAND}|${trx.NAMA_BARANG}`]?.hargaGrosir || 0,

        hargaReseller:
          masterMap[`${trx.NAMA_BRAND}|${trx.NAMA_BARANG}`]?.hargaReseller || 0,

        state: state[key]?.status || "ACTIVE",

        lastMetode: metode,
      };
    }

    const stock = stockMap[key];

    stock.owner = ownership[key]?.owner || stock.owner;

    stock.state = state[key]?.status || stock.state;

    stock.lastMetode = metode;

    // ===================================
    // STOCK MASUK
    // ===================================

    if (STOCK_IN.includes(metode)) {
      stock.qty += isImei ? 1 : normalizeNumber(trx.QTY);
    }

    // ===================================
    // STOCK KELUAR
    // ===================================

    if (STOCK_OUT.includes(metode)) {
      stock.qty -= isImei ? 1 : normalizeNumber(trx.QTY);
    }
  });

  return stockMap;
}
