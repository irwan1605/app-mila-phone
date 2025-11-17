import { db } from "../firebase";
import {
  ref,
  push,
  update,
  remove,
  onValue,
  get
} from "firebase/database";

// ==========================================
// 1. Realtime Listener Data Per Toko
// ==========================================
export function listenTransaksiByToko(tokoId, callback) {
  const transaksiRef = ref(db, `toko/${tokoId}/transaksi`);
  return onValue(transaksiRef, (snapshot) => {
    const data = snapshot.val() || {};
    const result = Object.keys(data).map((id) => ({
      id,
      ...data[id]
    }));
    callback(result);
  });
}

// ==========================================
// 2. Tambah transaksi
// ==========================================
export function addTransaksi(tokoId, data) {
  const transaksiRef = ref(db, `toko/${tokoId}/transaksi`);
  return push(transaksiRef, data);
}

// ==========================================
// 3. Edit transaksi
// ==========================================
export function updateTransaksi(tokoId, id, data) {
  const transaksiRef = ref(db, `toko/${tokoId}/transaksi/${id}`);
  return update(transaksiRef, data);
}

// ==========================================
// 4. Hapus transaksi
// ==========================================
export function deleteTransaksi(tokoId, id) {
  const transaksiRef = ref(db, `toko/${tokoId}/transaksi/${id}`);
  return remove(transaksiRef);
}

// ==========================================
// 5. Ambil nama toko
// ==========================================
export async function getTokoName(tokoId) {
  const tokoRef = ref(db, `toko/${tokoId}/nama`);
  const snap = await get(tokoRef);
  return snap.exists() ? snap.val() : `Toko ${tokoId}`;
}
