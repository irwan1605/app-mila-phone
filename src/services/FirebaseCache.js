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
