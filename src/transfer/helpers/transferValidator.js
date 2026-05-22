// src/transfer/helpers/transferValidator.js

import { normalize, normalizeImei } from "./normalize";

import { ACTIVE_TRANSFER_STATUS } from "../constants/transferStatus";

// ======================================
// 🔥 VALIDASI STATUS BOLEH TRANSFER
// ======================================
export const canTransferImei = (item) => {
  if (!item) return false;

  const status = normalize(item?.status || item?.STATUS || item?.finalStatus);

  // ======================================
  // 🔥 SOLD TIDAK BOLEH
  // ======================================
  if (status === "SOLD") {
    return false;
  }

  return ACTIVE_TRANSFER_STATUS.includes(status);
};

// ======================================
// 🔥 CEK SOLD FINAL
// ======================================
export const isSoldImei = (item) => {
  if (!item) return false;

  const status = normalize(item?.status || item?.STATUS || item?.finalStatus);

  return ["SOLD", "PENJUALAN"].includes(status);
};

// ======================================
// 🔥 CEK REFUND ACTIVE
// ======================================
export const isRefundActive = (item) => {
  if (!item) return false;

  const action = normalize(
    item?.lastAction ||
      item?.LAST_ACTION ||
      item?.metode ||
      item?.PAYMENT_METODE
  );

  return action === "REFUND";
};

// ======================================
// 🔥 VALIDASI OWNER TRANSFER
// ======================================
export const validateTransferOwnership = ({ currentOwner, tokoPengirim }) => {
  return normalize(currentOwner) === normalize(tokoPengirim);
};

// ======================================
// 🔥 VALIDASI IMEI ADA
// ======================================
export const validateImeiExists = (imei, inventory = []) => {
  if (!imei) return false;

  const clean = normalizeImei(imei);

  return inventory.some((x) => normalizeImei(x?.imei || x?.IMEI) === clean);
};

// ======================================
// 🔥 VALIDASI IMEI AKTIF
// ======================================
export const validateImeiActive = (imei, inventory = []) => {
  if (!imei) return false;

  const clean = normalizeImei(imei);

  const found = inventory.find(
    (x) => normalizeImei(x?.imei || x?.IMEI) === clean
  );

  if (!found) return false;

  return canTransferImei(found);
};

// ======================================
// 🔥 VALIDASI OWNER FINAL
// ======================================
export const validateImeiOwner = ({ imei, toko, inventory = [] }) => {
  if (!imei || !toko) return false;

  const clean = normalizeImei(imei);

  const found = inventory.find(
    (x) => normalizeImei(x?.imei || x?.IMEI) === clean
  );

  if (!found) return false;

  const owner = normalize(found?.toko || found?.NAMA_TOKO);

  return owner === normalize(toko);
};

// ======================================
// 🔥 VALIDASI NON IMEI STOCK
// ======================================
export const validateNonImeiQty = ({ qty, stock }) => {
  const finalQty = Number(qty || 0);

  const finalStock = Number(stock || 0);

  if (finalQty <= 0) {
    return false;
  }

  return finalQty <= finalStock;
};
