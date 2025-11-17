// src/data/Vendors.js

// Kategori pembelian (bisa disesuaikan)
export const PURCHASE_CATEGORIES = ["Accessories", "Handphone", "Motor Listrik"];

// Daftar vendor/supplier (contoh awal; silakan diubah sesuai real)
export const VENDORS = [
  {
    id: "VND001",
    name: "PT Sumber Gadget Nusantara",
    categories: ["Handphone", "Accessories"],
    paymentTerms: "Cash / 30 Hari",
    contact: "021-123456",
    address: "Jl. Sudirman No. 1, Jakarta",
  },
  {
    id: "VND002",
    name: "CV Energi Listrik Sejahtera",
    categories: ["Motor Listrik", "Accessories"],
    paymentTerms: "Cash / 14 Hari",
    contact: "021-654321",
    address: "Jl. Merdeka No. 8, Bekasi",
  },
  {
    id: "VND003",
    name: "UD Aksesoris Makmur",
    categories: ["Accessories"],
    paymentTerms: "Cash",
    contact: "-",
    address: "Gudang Pusat Aksesori Blok C",
  },
];
