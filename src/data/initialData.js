// src/data/initialData.js

import { TOKO_LABELS } from "../utils/TokoLabels";

// --- Data User Dummy ---
export const initialUsers = [
  {
    id: 1,
    username: "superadmin",
    password: "password",
    role: "superadmin",
    toko: null,
  },
  {
    id: 2,
    username: "pic_cilangkap",
    password: "password",
    role: "pic_tokoCILANGKAP",
    toko: "CILANGKAP",
  },
  {
    id: 3,
    username: "pic_pondokgede",
    password: "password",
    role: "pic_tokoPONDOK_GEDE",
    toko: "PONDOK GEDE",
  },
  {
    id: 4,
    username: "pic_jatiwarna",
    password: "password",
    role: "pic_tokoJATIWARNA",
    toko: "JATIWARNA",
  },
];

// --- Data Toko Dummy ---
// Ini adalah data penjualan atau aktivitas per toko, per bulan misalnya
// id: ID unik transaksi/record
// tokoId: ID toko yang terkait
// month: Bulan data
// sales: Contoh data penjualan
// otherMetric: Metrik lain
export const initialTokoData = {
  1: [
    // Data untuk CILANGKAP (tokoId: 1)
    { id: "t1m1", tokoId: 1, month: "January", sales: 15000, otherMetric: 100 },
    {
      id: "t1m2",
      tokoId: 1,
      month: "February",
      sales: 16000,
      otherMetric: 110,
    },
    { id: "t1m3", tokoId: 1, month: "March", sales: 17000, otherMetric: 120 },
  ],
  2: [
    // Data untuk PONDOK GEDE (tokoId: 2)
    { id: "t2m1", tokoId: 2, month: "January", sales: 10000, otherMetric: 80 },
    { id: "t2m2", tokoId: 2, month: "February", sales: 11000, otherMetric: 85 },
  ],
  3: [
    // Data untuk JATIWARNA (tokoId: 3)
    { id: "t3m1", tokoId: 3, month: "January", sales: 8000, otherMetric: 70 },
    { id: "t3m2", tokoId: 3, month: "February", sales: 9000, otherMetric: 75 },
  ],
};

// Fungsi untuk mendapatkan semua data toko (digunakan oleh Superadmin)
export const getAllTokoData = Object.values(initialTokoData).flat();

// --- Data Stok Aksesoris Dummy ---
// id: ID unik item stok
// name: Nama aksesoris
// tokoId: ID toko tempat aksesoris ini berada
// quantity: Jumlah stok
export const initialStockAccessories = [
  { id: "s1", name: "Case iPhone 13 Pro", tokoId: 1, quantity: 20 },
  { id: "s2", name: "Screen Protector Samsung A52", tokoId: 1, quantity: 35 },
  { id: "s3", name: "Charger Type C Fast Charging", tokoId: 1, quantity: 15 },

  { id: "s4", name: "Case iPhone 12 Mini", tokoId: 2, quantity: 10 },
  { id: "s5", name: "Screen Protector Redmi Note 10", tokoId: 2, quantity: 25 },
  { id: "s6", name: "Headset Bluetooth JBL", tokoId: 2, quantity: 8 },

  { id: "s7", name: "Power Bank 10000mAh", tokoId: 3, quantity: 12 },
  { id: "s8", name: "Kabel Data Micro USB", tokoId: 3, quantity: 40 },
];
