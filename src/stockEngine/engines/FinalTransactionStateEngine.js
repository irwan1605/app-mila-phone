// =======================================================
// src/stockEngine/engines/FinalTransactionStateEngine.js
// =======================================================

import { VALID_STATUS, STATUS } from "../constants/stockConstant";

import { normalize, normalizeImei } from "../helpers/normalize";

import { createImeiKey, createSkuKey } from "../helpers/createKey";

import { sortTransaction } from "../helpers/sortTransaction";

// =======================================================
// ENGINE
// =======================================================

export function FinalTransactionStateEngine({
  transaksi = [],

  ownership = {},
} = {}) {
  const stateMap = {};

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

    if (!stateMap[key]) {
      stateMap[key] = {
        key,

        owner: ownership[key]?.owner || trx.NAMA_TOKO || "",

        status: STATUS.ACTIVE,

        active: false,

        sold: false,

        refund: false,

        retur: false,

        reject: false,

        opname: false,

        deleted: false,

        transfer: false,

        isImei,

        lastMetode: "",

        transactionId: "",

        createdAt: 0,

        history: [],
      };
    }

    const state = stateMap[key];

    state.owner = ownership[key]?.owner || state.owner;

    state.lastMetode = metode;

    state.transactionId = trx.id;

    state.createdAt =
      trx.CREATED_AT || trx.UPDATED_AT || trx.TANGGAL_TRANSAKSI || 0;

    state.history.push({
      id: trx.id,

      metode,

      toko: trx.NAMA_TOKO,

      createdAt: state.createdAt,
    });

    // =====================================
    // PEMBELIAN
    // =====================================

    if (metode === "PEMBELIAN") {
      state.status = STATUS.ACTIVE;

      state.active = true;

      state.sold = false;

      state.reject = false;

      state.refund = false;

      state.retur = false;

      state.transfer = false;

      state.opname = false;

      state.deleted = false;

      return;
    }

    // =====================================
    // TRANSFER MASUK
    // =====================================

    if (metode === "TRANSFER_MASUK") {
      state.status = STATUS.ACTIVE;

      state.active = true;

      state.transfer = true;

      state.sold = false;

      state.reject = false;

      state.refund = false;

      state.retur = false;

      state.opname = false;

      state.deleted = false;

      return;
    }

    // =====================================
    // TRANSFER REJECT
    // =====================================

    if (metode === "TRANSFER_REJECT") {
      state.status = STATUS.ACTIVE;

      state.active = true;

      state.transfer = true;

      state.reject = false;

      state.sold = false;

      state.refund = false;

      state.retur = false;

      state.opname = false;

      state.deleted = false;

      return;
    }

    // =====================================
    // REFUND
    // =====================================

    if (metode === "REFUND") {
      state.status = STATUS.REFUND;

      state.active = true;

      state.refund = true;

      state.sold = false;

      state.reject = false;

      state.retur = false;

      state.transfer = false;

      state.opname = false;

      state.deleted = false;

      return;
    }

    // =====================================
    // RETUR
    // =====================================

    if (metode === "RETUR") {
      state.status = STATUS.RETUR;

      state.active = true;

      state.retur = true;

      state.refund = false;

      state.sold = false;

      state.reject = false;

      state.transfer = false;

      state.opname = false;

      state.deleted = false;

      return;
    }

    // =====================================
    // TRANSFER KELUAR
    // =====================================

    if (metode === "TRANSFER_KELUAR") {
      state.status = STATUS.TRANSFER;

      state.active = false;

      state.transfer = true;

      state.sold = false;

      state.reject = false;

      state.refund = false;

      state.retur = false;

      state.opname = false;

      state.deleted = false;

      return;
    }

    // =====================================
    // PENJUALAN
    // =====================================

    if (metode === "PENJUALAN") {
      state.status = STATUS.SOLD;

      state.active = false;

      state.sold = true;

      state.transfer = false;

      state.reject = false;

      state.refund = false;

      state.retur = false;

      state.opname = false;

      state.deleted = false;

      return;
    }

    // =====================================
    // REJECT
    // =====================================

    if (metode === "REJECT") {
      state.status = STATUS.REJECT;

      state.active = false;

      state.reject = true;

      state.transfer = false;

      state.sold = false;

      state.refund = false;

      state.retur = false;

      state.opname = false;

      state.deleted = false;

      return;
    }

    // =====================================
    // STOCK OPNAME
    // =====================================

    if (metode === "STOK OPNAME") {
      state.status = STATUS.OPNAME;

      state.active = false;

      state.opname = true;

      state.transfer = false;

      state.sold = false;

      state.reject = false;

      state.refund = false;

      state.retur = false;

      state.deleted = false;

      return;
    }

    // =====================================
    // VOID OPNAME
    // =====================================

    if (metode === "VOID OPNAME") {
      state.status = STATUS.ACTIVE;

      state.active = true;

      state.opname = false;

      state.transfer = false;

      state.sold = false;

      state.reject = false;

      state.refund = false;

      state.retur = false;

      state.deleted = false;

      return;
    }
  });

  return stateMap;
}
