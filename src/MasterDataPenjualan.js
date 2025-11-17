// Data penjualan awal per toko — dipakai untuk seed localStorage
const SEED_SALES = {
    1: [
      {
        id: 1,
        tanggal: "2025-11-01",
        produk: "Handphone A",
        warna: "Hitam",
        qty: 1,
        harga: 2500000,
        imei1: "1234567890",
        imei2: "",
        approved: false,
        approvedBy: "",
        approvedAt: "",
      },
    ],
    2: [
      {
        id: 1,
        tanggal: "2025-11-02",
        produk: "Handphone B",
        warna: "Biru",
        qty: 2,
        harga: 3000000,
        imei1: "0987654321",
        imei2: "",
        approved: true,
        approvedBy: "superadmin",
        approvedAt: "2025-11-03 10:00",
      },
    ],
  };
  
  export default SEED_SALES;
  
  // Helpers simpan/muat dari localStorage
  const LS_KEY = "salesByToko";
  
  export const loadSales = () => {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  
  export const saveSales = (obj) => {
    localStorage.setItem(LS_KEY, JSON.stringify(obj ?? {}));
  };
  