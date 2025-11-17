import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  get,
} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyChHAGbs6yBJ04Pe_1XTyDTcWSOW04Yl0M",
  authDomain: "mila-phone-realtime.firebaseapp.com",
  databaseURL: "https://mila-phone-realtime-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mila-phone-realtime",
  storageBucket: "mila-phone-realtime.firebasestorage.app",
  messagingSenderId: "283562738302",
  appId: "1:283562738302:web:0238792f8da3a3ffc3ce2f",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Get toko name
export const getTokoName = async (tokoId) => {
  try {
    const snap = await get(ref(db, `toko/${tokoId}/info/name`));
    return snap.exists() ? snap.val() : null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

// Listen transactions per toko (realtime)
export const listenTransaksiByToko = (tokoId, callback) => {
  const r = ref(db, `toko/${tokoId}/transaksi`);
  const unsub = onValue(r, (snap) => {
    const raw = snap.val() || {};
    const list = Object.entries(raw).map(([id, item]) => ({ id, ...item }));
    callback(list);
  });
  return () => unsub && unsub();
};

export const addTransaksi = (tokoId, data) => {
  const r = push(ref(db, `toko/${tokoId}/transaksi`));
  return set(r, data);
};
export const updateTransaksi = (tokoId, id, data) => {
  return update(ref(db, `toko/${tokoId}/transaksi/${id}`), data);
};
export const deleteTransaksi = (tokoId, id) => {
  return remove(ref(db, `toko/${tokoId}/transaksi/${id}`));
};

// listen all toko transactions (for dashboard pusat)
export const listenAllTransaksi = (callback) => {
  const r = ref(db, "toko");
  const unsub = onValue(r, (snap) => {
    const raw = snap.val() || {};
    const merged = [];
    Object.entries(raw).forEach(([tokoId, tokoData]) => {
      const tokoName = tokoData.info?.name || `TOKO ${tokoId}`;
      if (tokoData.transaksi) {
        Object.entries(tokoData.transaksi).forEach(([id, row]) => {
          merged.push({
            id,
            tokoId,
            TANGGAL: row.TANGGAL || "",
            BRAND: row.BRAND || "",
            IMEI: row.IMEI || "",
            NO_MESIN: row.NO_MESIN || "",
            QTY: typeof row.QTY !== "undefined" ? Number(row.QTY) : 0,
            HARGA: typeof row.HARGA !== "undefined" ? Number(row.HARGA) : 0,
            NAMA_SALES: row.NAMA_SALES || "",
            TOKO: tokoName,
          });
        });
      }
    });
    // sort by date desc
    merged.sort((a,b) => {
      const da = a.TANGGAL ? new Date(a.TANGGAL) : new Date(0);
      const dbd = b.TANGGAL ? new Date(b.TANGGAL) : new Date(0);
      return dbd - da;
    });
    callback(merged);
  });
  return () => unsub && unsub();
};
