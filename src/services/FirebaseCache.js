import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import {
  listenAllTransaksi,
  listenStockAll,
  listenMasterBarang,
} from "./FirebaseService";
/* =======================================================
   DETAIL STOCK CACHE
======================================================= */


let transaksiCache = [];

let transaksiSubscribers = [];

let transaksiUnsub = null;
let transaksiStopTimer = null;

let penjualanCache = [];
let penjualanSubscribers = [];
const buildPenjualanCache = (rows = []) =>
  rows
    .filter((trx) => {
      const statusPembayaran = String(trx?.statusPembayaran || "")
        .toUpperCase()
        .trim();
      const status = String(trx?.STATUS || "").toUpperCase().trim();

      return !(
        statusPembayaran === "REFUND" ||
        status === "REFUND" ||
        trx?.refundProcessed === true ||
        trx?.IS_REFUND === true
      );
    })
    .map((trx) => ({
      ...trx,
      trxKey: trx?.trxKey || trx?.id,
    }))
    .sort((a, b) => Number(b?.createdAt || 0) - Number(a?.createdAt || 0));

const notifyTransaksiSubscribers = (rows) => {
  transaksiSubscribers.forEach((subscriber) => subscriber(rows));
  penjualanSubscribers.forEach((subscriber) =>
    subscriber(penjualanCache)
  );
};

const ensureTransaksiListener = () => {
  if (transaksiStopTimer) {
    clearTimeout(transaksiStopTimer);
    transaksiStopTimer = null;
  }
  if (transaksiUnsub) return;

  transaksiUnsub = listenAllTransaksi((rows) => {
    transaksiCache = Array.isArray(rows) ? rows : [];
    penjualanCache = buildPenjualanCache(transaksiCache);
    notifyTransaksiSubscribers(transaksiCache);
  });
};

const stopTransaksiListenerIfIdle = () => {
  if (
    transaksiSubscribers.length > 0 ||
    penjualanSubscribers.length > 0 ||
    !transaksiUnsub ||
    transaksiStopTimer
  ) return;

  // Hindari download ulang snapshot besar ketika pengguna berpindah route.
  transaksiStopTimer = setTimeout(() => {
    transaksiStopTimer = null;
    if (
      transaksiSubscribers.length === 0 &&
      penjualanSubscribers.length === 0 &&
      transaksiUnsub
    ) {
      transaksiUnsub();
      transaksiUnsub = null;
    }
  }, 15000);
};

export function listenPenjualanCached(callback) {
  penjualanSubscribers.push(callback);
  callback(penjualanCache);

  ensureTransaksiListener();

  return () => {
    penjualanSubscribers = penjualanSubscribers.filter(
      (subscriber) => subscriber !== callback
    );

    stopTransaksiListenerIfIdle();
  };
}

export function listenAllTransaksiCached(callback) {
  transaksiSubscribers.push(callback);

  callback(transaksiCache);

  ensureTransaksiListener();

  return () => {
    transaksiSubscribers = transaksiSubscribers.filter((cb) => cb !== callback);

    stopTransaksiListenerIfIdle();
  };
}

/* =======================================================
   MASTER BARANG CACHE
   Satu listener dipakai bersama oleh semua halaman yang memakai cache.
======================================================= */
let masterBarangCache = [];
let masterBarangSubscribers = [];
let masterBarangUnsub = null;

export function listenMasterBarangCached(callback) {
  masterBarangSubscribers.push(callback);
  callback(masterBarangCache);

  if (!masterBarangUnsub) {
    masterBarangUnsub = listenMasterBarang((rows) => {
      masterBarangCache = Array.isArray(rows) ? rows : [];
      masterBarangSubscribers.forEach((subscriber) => subscriber(masterBarangCache));
    });
  }

  return () => {
    masterBarangSubscribers = masterBarangSubscribers.filter(
      (subscriber) => subscriber !== callback
    );

    if (masterBarangSubscribers.length === 0 && masterBarangUnsub) {
      masterBarangUnsub();
      masterBarangUnsub = null;
    }
  };
}

let stockCache = {};

let stockListeners = [];

let stockUnsub = null;
let stockStopTimer = null;

export function listenStockAllCached(callback) {
  stockListeners.push(callback);
  callback(stockCache);

  if (stockStopTimer) {
    clearTimeout(stockStopTimer);
    stockStopTimer = null;
  }

  if (!stockUnsub) {
    stockUnsub = listenStockAll((rows) => {
      stockCache = rows || {};
      stockListeners.forEach((subscriber) => subscriber(stockCache));
    });
  }

  return () => {
    stockListeners = stockListeners.filter(
      (subscriber) => subscriber !== callback
    );

    if (stockListeners.length === 0 && stockUnsub && !stockStopTimer) {
      stockStopTimer = setTimeout(() => {
        stockStopTimer = null;
        if (stockListeners.length === 0 && stockUnsub) {
          stockUnsub();
          stockUnsub = null;
        }
      }, 15000);
    }
  };
}

export function listenDetailStockCached(callback) {
  return listenStockAllCached(callback);
}

/* =======================================================
   TOKO CACHE
======================================================= */

let tokoSnapshot = null;

let tokoSubscribers = [];

let tokoUnsubscribe = null;

export function listenTokoCached(callback) {
  tokoSubscribers.push(callback);

  if (tokoSnapshot) {
    callback(tokoSnapshot);
  }

  if (!tokoUnsubscribe) {
    tokoUnsubscribe = onValue(
      ref(db, "toko"),

      (snap) => {
        tokoSnapshot = snap;

        tokoSubscribers.forEach((cb) => cb(snap));
      }
    );
  }

  

  return () => {
    tokoSubscribers = tokoSubscribers.filter((cb) => cb !== callback);

    if (tokoSubscribers.length === 0 && tokoUnsubscribe) {
      tokoUnsubscribe();

      tokoUnsubscribe = null;

      tokoSnapshot = null;
    }
  };
}
