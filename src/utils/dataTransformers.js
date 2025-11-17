// src/utils/dataTransformers.js

// ================================================================
// 1. KONFIGURASI HEADERS UNTUK BERBAGAI JENIS DATA
//    Ini mendefinisikan kolom-kolom yang diharapkan untuk setiap jenis data
//    saat berinteraksi dengan Google Sheets atau CSV.
// ================================================================
export const SHEET_HEADERS = {
    // Headers untuk data Produk (misal: halaman Products)
    PRODUCTS: [
      'id', 'nama', 'kategori', 'brand', 'model', 'warna', 'harga_srp', 'harga_grosir',
      'stok_pusat', 'stok_toko', 'supplier', 'deskripsi', 'gambar_url', 'tanggal_masuk', 'terakhir_update'
    ],
  
    // Headers untuk data Penjualan (misal: halaman SalesReport, DashboardToko)
    SALES: [
      'id', 'tanggal', 'toko_id', 'toko_nama', 'sales_nama', 'nik', 'produk_brand', 'produk_nama',
      'produk_warna', 'qty', 'harga_satuan', 'tipe_harga', 'subtotal', 'mdr_persen', 'mdr_fee', 'net',
      'metode_pembayaran', 'leasing_nama', 'tenor', 'bunga_persen', 'dp_merchant', 'dp_toko', 'dp_talangan',
      'grand_total', 'cicilan_per_bulan', 'imei1', 'imei2', 'ongkir_hscard', 'aksesoris1_desc',
      'aksesoris1_amount', 'aksesoris2_desc', 'aksesoris2_amount', 'bundling_protect_amount',
      'free1', 'free2', 'free3', 'akun_pelanggan', 'no_hp', 'no_kontrak', 'sales_handle_titipan',
      'note', 'tgl_pengambilan', 'alamat_pengiriman', 'status', 'approved_by', 'approved_at'
    ],
  
    // Headers untuk data Inventaris (misal: halaman InventoryReport)
    INVENTORY: [
      'id', 'produk_id', 'produk_nama', 'toko_id', 'toko_nama', 'stok_masuk', 'stok_keluar',
      'stok_akhir', 'tanggal_transaksi', 'keterangan', 'user_id'
    ],
  
    // Headers untuk data Pengguna (misal: halaman UserManagement)
    USERS: [
      'username', 'password', 'nama', 'role', 'toko', 'last_login', 'is_active'
    ],
  
    // Headers untuk data Stok Aksesoris (misal: StockAccessories)
    STOCK_ACCESSORIES: [
      'id', 'nama', 'kategori', 'brand', 'model', 'harga_beli', 'harga_jual', 'stok_toko', 'lokasi_rak',
      'tanggal_masuk', 'terakhir_update'
    ],
  
    // Headers untuk data Stok Handphone (misal: StockHandphone)
    STOCK_HANDPHONE: [
      'id', 'nama', 'brand', 'model', 'imei', 'warna', 'harga_beli', 'harga_jual', 'stok_toko',
      'garansi_exp', 'tanggal_masuk', 'terakhir_update'
    ],
  
    // Headers untuk data Stok Motor Listrik (misal: StockMotorListrik)
    STOCK_MOTOR_LISTRIK: [
      'id', 'nama', 'brand', 'model', 'no_rangka', 'no_dinamo', 'warna', 'baterai_tipe', 'charger_tipe',
      'harga_beli', 'harga_jual', 'stok_toko', 'garansi_exp', 'tanggal_masuk', 'terakhir_update'
    ],
  
    // Headers untuk Finance Report (jika diekspor ke Sheets)
    FINANCE_REPORT: [
      'tanggal', 'toko_nama', 'kategori_transaksi', 'jumlah', 'keterangan', 'no_referensi', 'dibuat_oleh'
    ]
  };
  
  
  // ================================================================
  // 2. FUNGSI UNTUK KONVERSI DATA (ARRAY OF OBJECTS <-> CSV/SHEETS 2D ARRAY)
  // ================================================================
  
  /**
   * Mengubah array of objects menjadi string CSV.
   * @param {Array<Object>} data - Array objek data, misal: [{ id: 1, nama: 'A' }]
   * @param {Array<string>} [headers=null] - Optional. Daftar header yang spesifik. Jika null, akan pakai key dari objek pertama.
   * @returns {string} String format CSV
   */
  export const convertArrayOfObjectsToCSV = (data, headers = null) => {
    if (!data || data.length === 0) return '';
  
    const finalHeaders = headers || Object.keys(data[0]);
    const csvRows = [];
  
    // Header row
    csvRows.push(finalHeaders.map(h => `"${h}"`).join(',')); // Wrap headers in quotes
  
    // Data rows
    data.forEach(row => {
      const values = finalHeaders.map(header => {
        let value = row[header] ?? ''; // Gunakan '' untuk nilai null/undefined
        if (typeof value === 'string') {
          // Escape quotes dan wrap dalam double quotes jika ada koma atau quotes
          const escaped = value.replace(/"/g, '""');
          if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('\r')) {
            value = `"${escaped}"`;
          } else {
            value = escaped; // Biarkan tanpa quotes jika tidak ada koma/quotes
          }
        }
        return value;
      });
      csvRows.push(values.join(','));
    });
  
    return csvRows.join('\n');
  };
  
  /**
   * Mengubah string CSV menjadi array of objects.
   * @param {string} csvString - String format CSV
   * @returns {Array<Object>} Array objek data
   */
  export const convertCSVToArrayOfObjects = (csvString) => {
    if (!csvString || csvString.trim() === '') return [];
  
    const lines = csvString.trim().split('\n');
    if (lines.length === 0) return [];
  
    // Parse header row
    // Regex yang lebih robust untuk menangani koma di dalam quotes
    const headerLine = lines[0];
    const csvHeaders = (headerLine.match(/(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^,]*))(?:,|$)/g) || [])
      .map(h => h.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim()) // Bersihkan quotes dan spasi
      .filter(h => h !== ''); // Hapus entri kosong jika ada trailing comma
  
    if (csvHeaders.length === 0) return [];
  
    const result = [];
  
    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i].trim();
      if (!currentLine) continue; // Skip empty lines
  
      const values = (currentLine.match(/(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^,]*))(?:,|$)/g) || [])
        .map(v => v.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim());
  
      let obj = {};
      for (let j = 0; j < csvHeaders.length; j++) {
        const header = csvHeaders[j];
        const value = values[j] || ''; // Pastikan ada nilai, meskipun kosong
        
        // Coba konversi ke number jika memungkinkan
        if (!isNaN(value) && value !== '') {
          obj[header] = Number(value);
        } else {
          obj[header] = value;
        }
      }
      result.push(obj);
    }
    return result;
  };
  
  /**
   * Mengubah array of objects menjadi format 2D array yang sesuai untuk Google Sheets.
   * @param {Array<Object>} data - Array objek data, misal: [{ id: 1, nama: 'A' }]
   * @param {Array<string>} [headers=null] - Optional. Daftar header yang spesifik. Jika null, akan pakai key dari objek pertama.
   * @returns {Array<Array<any>>} Array 2D untuk Google Sheets
   */
  export const formatForSheets = (data, headers = null) => {
    if (!data || data.length === 0) return [['No data available']];
  
    const finalHeaders = headers || Object.keys(data[0]);
    const sheetData = [finalHeaders]; // Baris pertama adalah header
  
    data.forEach(item => {
      const row = finalHeaders.map(header => item[header] ?? ''); // Gunakan '' untuk nilai null/undefined
      sheetData.push(row);
    });
  
    return sheetData;
  };
  
  /**
   * Mengubah format tanggal ke string ISO (YYYY-MM-DD)
   * @param {Date | string} date - Objek Date atau string tanggal
   * @returns {string} Tanggal dalam format YYYY-MM-DD
   */
  export const toISODateString = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };