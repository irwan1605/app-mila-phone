// =======================================================
// src/stockEngine/engines/FinalOwnershipEngine.js
// =======================================================

import { VALID_STATUS, STOCK_IN, STOCK_OUT } from "../constants/stockConstant";

import {
  normalize,
  normalizeImei,
  normalizeText,
  normalizeNumber,
} from "../helpers/normalize";

import { createImeiKey, createSkuKey } from "../helpers/createKey";

import { sortTransaction } from "../helpers/sortTransaction";

// =======================================================
// ENGINE
// =======================================================

export function FinalOwnershipEngine({ transaksi = [] } = {}) {
  const ownerMap = {};

  const rows = sortTransaction(transaksi);

  rows.forEach((trx) => {
    const status = normalize(trx.STATUS);

    if (!VALID_STATUS.includes(status)) return;

    const metode = normalize(trx.PAYMENT_METODE);

    const isImei = normalizeImei(trx.IMEI) !== "";

    const key = isImei
      ? createImeiKey(trx.IMEI)
      : createSkuKey({
          toko: trx.NAMA_TOKO,

          brand: trx.NAMA_BRAND,

          barang: trx.NAMA_BARANG,
        });

    if (!ownerMap[key]) {
      ownerMap[key] = {
        key,

        owner: trx.NAMA_TOKO || "",

        qty: 0,

        active: false,

        isImei,

        lastMetode: "",

        transactionId: trx.id,

        createdAt:
          trx.CREATED_AT || trx.UPDATED_AT || trx.TANGGAL_TRANSAKSI || 0,

        history: [],
      };
    }

    const owner = ownerMap[key];

    owner.transactionId = trx.id;

    owner.createdAt =
      trx.CREATED_AT || trx.UPDATED_AT || trx.TANGGAL_TRANSAKSI || 0;

    owner.lastMetode = metode;

    owner.history.push({
      id: trx.id,

      metode,

      toko: trx.NAMA_TOKO,

      qty: normalizeNumber(trx.QTY),

      createdAt: owner.createdAt,
    });

    // ===========================================
    // PEMBELIAN
    // ===========================================

    if (metode === "PEMBELIAN") {
      owner.owner = trx.NAMA_TOKO;

      owner.active = true;

      owner.qty += isImei ? 1 : normalizeNumber(trx.QTY);

      return;
    }

    // ===========================================
    // TRANSFER MASUK
    // ===========================================

    if (metode === "TRANSFER_MASUK") {
      owner.owner = trx.NAMA_TOKO || trx.TOKO_TUJUAN || trx.ke || owner.owner;

      owner.active = true;

      owner.qty += isImei ? 1 : normalizeNumber(trx.QTY);

      return;
    }

    // ===========================================
    // TRANSFER REJECT
    // ===========================================

    if (metode === "TRANSFER_REJECT") {
      owner.owner = trx.NAMA_TOKO || owner.owner;

      owner.active = true;

      owner.qty += isImei ? 1 : normalizeNumber(trx.QTY);

      return;
    }

    // ===========================================
    // REFUND
    // ===========================================

    if (metode === "REFUND" || metode === "RETUR") {
      owner.owner = trx.NAMA_TOKO || owner.owner;

      owner.active = true;

      owner.qty += isImei ? 1 : normalizeNumber(trx.QTY);

      return;
    }

    // ===========================================
    // VOID OPNAME
    // ===========================================

    if (metode === "VOID OPNAME") {
      owner.owner = trx.NAMA_TOKO || owner.owner;

      owner.active = true;

      owner.qty += isImei ? 1 : normalizeNumber(trx.QTY);

      return;
    }

    // ===========================================
    // TRANSFER KELUAR
    // ===========================================

    if (metode === "TRANSFER_KELUAR") {
      owner.owner =
        trx.OWNER_AKHIR ||
        trx.TOKO_TUJUAN ||
        trx.TOKO_PENERIMA ||
        trx.ke ||
        trx.tokoTujuan ||
        trx.tokoPenerima ||
        owner.owner;

      owner.active = true;

      owner.qty -= isImei ? 1 : normalizeNumber(trx.QTY);

      return;
    }

    // ===========================================
    // PENJUALAN
    // ===========================================

    if (metode === "PENJUALAN") {
      owner.active = false;

      owner.qty -= isImei ? 1 : normalizeNumber(trx.QTY);

      return;
    }

    // ===========================================
    // REJECT
    // ===========================================

    if (metode === "REJECT") {
      owner.active = false;

      owner.qty -= isImei ? 1 : normalizeNumber(trx.QTY);

      return;
    }

    // ===========================================
    // STOCK OPNAME
    // ===========================================

    if (metode === "STOK OPNAME") {
      owner.active = false;

      owner.qty -= isImei ? 1 : normalizeNumber(trx.QTY);

      return;
    }
  });

  return ownerMap;
}
