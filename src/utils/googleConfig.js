// src/utils/googleConfig.js Mila Phone
export const GOOGLE_CONFIG = {
    discoveryDocs: [
      'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
      'https://sheets.googleapis.com/$discovery/rest?version=v4'
    ],
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
    sheetRanges: {
      PRODUCTS: 'Products!A:Z',
      SALES: 'Sales!A:Z',
      INVENTORY: 'Inventory!A:Z',
      STOCK_ACCESSORIES: 'StockAccessories!A:Z',
      STOCK_HANDPHONE: 'StockHandphone!A:Z',
      STOCK_MOTOR: 'StockMotorListrik!A:Z'
    }
  };
  
  export const SHEET_HEADERS = {
    PRODUCTS: ['id', 'nama', 'kategori', 'harga', 'stok', 'updated_at'],
    SALES: ['id', 'tanggal', 'produk', 'qty', 'harga', 'total', 'toko_id', 'user_id'],
    INVENTORY: ['id', 'produk', 'stok_awal', 'stok_akhir', 'tanggal', 'toko_id']
  };