// src/data/database.js
// =====================================================
// Database Global (React Version)
// Terhubung langsung ke DashboardToko.jsx & DataManagement.jsx
// =====================================================

// === Data Awal (Dummy + Import CSV Merge) ===
// Kamu bisa menambah data lain di sini, akan otomatis tersimpan ke localStorage
const initialData = [
    {
      id: 1,
      TANGGAL: "2025-11-01",
      TOKO: "CILANGKAP",
      BRAND: "Samsung",
      IMEI: "357889000112233",
      NO_MESIN: "ENG-98765",
      NAMA_PRODUK: "Samsung A55",
      PAYMENT_METODE: "CASH",
      MDR: "0%",
      KATEGORI_HARGA: "Retail",
      MP_PROTECK: "Tidak",
      TENOR: "-",
      NAMA_SALES: "Rani",
      SH: "Andi",
      SL: "Budi",
      QTY: 2,
      HARGA: 4500000,
      STATUS: "Approved",
    },
    {
      id: 2,
      TANGGAL: "2025-11-02",
      TOKO: "CIBINONG",
      BRAND: "iPhone",
      IMEI: "352001882456123",
      NO_MESIN: "ENG-65432",
      NAMA_PRODUK: "iPhone 14",
      PAYMENT_METODE: "DEBIT",
      MDR: "0.7%",
      KATEGORI_HARGA: "Premium",
      MP_PROTECK: "Ya",
      TENOR: "12 Bulan",
      NAMA_SALES: "Fina",
      SH: "Dewi",
      SL: "Toni",
      QTY: 1,
      HARGA: 14500000,
      STATUS: "Pending",
    },
    {
      id: 3,
      TANGGAL: "2025-11-03",
      TOKO: "GAS ALAM",
      BRAND: "Xiaomi",
      IMEI: "866889009911122",
      NO_MESIN: "ENG-33321",
      NAMA_PRODUK: "Redmi Note 13",
      PAYMENT_METODE: "KREDIT",
      MDR: "1.2%",
      KATEGORI_HARGA: "Ekonomis",
      MP_PROTECK: "Tidak",
      TENOR: "6 Bulan",
      NAMA_SALES: "Andra",
      SH: "Lina",
      SL: "Rudi",
      QTY: 3,
      HARGA: 2500000,
      STATUS: "Approved",
    },
  ];
  
  // === Nama Toko (10 Toko) ===
  export const tokoList = [
    "CILANGKAP",
    "CIBINONG",
    "GAS ALAM",
    "CITEUREUP",
    "CIRACAS",
    "METLAND 1",
    "METLAND 2",
    "PITARA",
    "KOTA WISATA",
    "PERMATA",
    "PUSAT",
  ];
  
  // =====================================================
  // LOCALSTORAGE HANDLER
  // =====================================================
  const STORAGE_KEY = "mila_phone_database";
  
  // Ambil dari localStorage (fallback ke initialData)
  export const loadDatabase = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Gagal load localStorage:", e);
    }
    return initialData;
  };
  
  // Simpan ke localStorage
  export const updateDatabase = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Gagal update localStorage:", e);
    }
  };
  
  // =====================================================
  // GETTERS
  // =====================================================
  export const getAllData = () => loadDatabase();
  
  export const getAllToko = () => tokoList;
  
  export const getDataByToko = (tokoName) => {
    const all = loadDatabase();
    return all.filter((r) => r.TOKO?.toUpperCase() === tokoName.toUpperCase());
  };
  
  // =====================================================
  // DROPDOWN OPTIONS (untuk form dinamis)
  // =====================================================
  export const getDropdownOptions = () => {
    const all = loadDatabase();
    const unique = (key) => [...new Set(all.map((d) => d[key]).filter(Boolean))];
  
    return {
      BRAND: unique("BRAND"),
      PAYMENT_METODE: unique("PAYMENT_METODE"),
      KATEGORI_HARGA: unique("KATEGORI_HARGA"),
      MP_PROTECK: unique("MP_PROTECK"),
      TENOR: unique("TENOR"),
      NAMA_SALES: unique("NAMA_SALES"),
      SH: unique("SH"),
      SL: unique("SL"),
    };
  };
  
  // =====================================================
  // TAMBAH, EDIT, DELETE, APPROVAL LOGIC
  // =====================================================
  export const addRecord = (record) => {
    const all = loadDatabase();
    const newRecord = { ...record, id: Date.now(), STATUS: "Pending" };
    const updated = [...all, newRecord];
    updateDatabase(updated);
    return newRecord;
  };
  
  export const editRecord = (id, updates) => {
    const all = loadDatabase();
    const idx = all.findIndex((r) => r.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      updateDatabase(all);
      return all[idx];
    }
    return null;
  };
  
  export const deleteRecord = (id) => {
    const all = loadDatabase();
    const updated = all.filter((r) => r.id !== id);
    updateDatabase(updated);
    return updated;
  };
  
  export const approveRecord = (id, status) => {
    const all = loadDatabase();
    const idx = all.findIndex((r) => r.id === id);
    if (idx >= 0) {
      all[idx].STATUS = status;
      updateDatabase(all);
      return all[idx];
    }
    return null;
  };
  
  // =====================================================
  // EXPORT DEFAULT
  // =====================================================
  const database = {
    tokoList,
    initialData,
    getAllData,
    getDataByToko,
    getAllToko,
    updateDatabase,
    getDropdownOptions,
    addRecord,
    editRecord,
    deleteRecord,
    approveRecord,
  };
  
  export default database;
  