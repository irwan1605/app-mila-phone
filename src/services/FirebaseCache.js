import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { listenAllTransaksi } from "./FirebaseService";
/* =======================================================
   DETAIL STOCK CACHE
======================================================= */
let transaksiCache = [];

let transaksiSubscribers = [];

let transaksiUnsub = null;

export function listenAllTransaksiCached(callback) {
  transaksiSubscribers.push(callback);

  callback(transaksiCache);

  if (!transaksiUnsub) {
    transaksiUnsub = listenAllTransaksi((rows) => {
      transaksiCache = rows || [];

      transaksiSubscribers.forEach((cb) => cb(transaksiCache));
    });
  }

  return () => {
    transaksiSubscribers = transaksiSubscribers.filter((cb) => cb !== callback);

    if (transaksiSubscribers.length === 0 && transaksiUnsub) {
      transaksiUnsub();

      transaksiUnsub = null;
    }
  };
}

let detailStockCache = {};

let detailSubscribers = [];

let detailUnsubscribe = null;

export function listenDetailStockCached(callback) {
  detailSubscribers.push(callback);

  callback(detailStockCache);

  if (!detailUnsubscribe) {
    detailUnsubscribe = onValue(
      ref(db, "detail_stock"),

      (snap) => {
        detailStockCache = snap.val() || {};

        detailSubscribers.forEach((cb) => cb(detailStockCache));
      }
    );
  }

  return () => {
    detailSubscribers = detailSubscribers.filter((cb) => cb !== callback);

    if (detailSubscribers.length === 0 && detailUnsubscribe) {
      detailUnsubscribe();

      detailUnsubscribe = null;
    }
  };
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
