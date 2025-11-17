import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../components/GoogleAuth/AuthContext';
import { SHEET_HEADERS, formatForSheets } from '../utils/dataTransformers'; // <-- IMPORT SHEET_HEADERS

export const useGoogleSheets = (spreadsheetId = process.env.REACT_APP_GOOGLE_SHEET_ID) => {
  const { accessToken, isAuthenticated } = useAuth();
  const [data, setData] = useState([]); // Raw data fetched from sheet
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Memoize the Sheets API client to avoid re-creating on every render
  const sheetsApi = useCallback(() => {
    if (!accessToken) return null;
    const client = axios.create({
      baseURL: 'https://sheets.googleapis.com/v4/spreadsheets',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return client;
  }, [accessToken]);

  // Fetch data from specific sheet range
  // Mengembalikan data mentah (2D array) dari Google Sheets
  const fetchDataFromSheet = useCallback(async (range = 'Sheet1!A:Z') => {
    if (!isAuthenticated || !accessToken || !spreadsheetId) {
      setError('Authentication or spreadsheet ID required');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const api = sheetsApi();
      if (!api) throw new Error('API not initialized (missing access token)');

      const response = await api.get(`/${spreadsheetId}/values/${range}`);
      const values = response.data.values || [];

      setData(values); // Set data mentah ke state internal
      setLastUpdated(new Date());
      return values; // Mengembalikan nilai mentah
    } catch (err) {
      console.error('Sheets fetch error:', err);
      setError(err.response?.data?.error?.message || err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, accessToken, spreadsheetId, sheetsApi]);

  // Append data to sheet (adds new rows)
  const appendDataToSheet = useCallback(async (values, range = 'Sheet1!A1') => {
    if (!isAuthenticated || !accessToken || !spreadsheetId) {
      setError('Authentication or spreadsheet ID required');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const api = sheetsApi();
      if (!api) throw new Error('API not initialized (missing access token)');

      const response = await api.post(
        `/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        { values }
      );

      console.log('Data appended to Sheets:', response.data);
      setLastUpdated(new Date());
      return true;
    } catch (err) {
      console.error('Sheets append error:', err);
      setError(err.response?.data?.error?.message || err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, accessToken, spreadsheetId, sheetsApi]);

  // Update specific range in sheet (overwrites existing cells)
  const updateSheetRange = useCallback(async (range, values) => {
    if (!isAuthenticated || !accessToken || !spreadsheetId) {
      setError('Authentication or spreadsheet ID required');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const api = sheetsApi();
      if (!api) throw new Error('API not initialized (missing access token)');

      const response = await api.put(
        `/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
        { values }
      );

      console.log('Sheet range updated:', response.data);
      setLastUpdated(new Date());
      return true;
    } catch (err) {
      console.error('Sheets update error:', err);
      setError(err.response?.data?.error?.message || err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, accessToken, spreadsheetId, sheetsApi]);

  // Export app data (array of objects) to a specific sheet
  // Overwrites the specified range with new data, including headers
  const exportDataToSheet = useCallback(async (appData, sheetName, dataTypeKey) => {
    if (!appData || appData.length === 0) {
      setError('No data to export');
      return false;
    }
    if (!SHEET_HEADERS[dataTypeKey.toUpperCase()]) {
      setError(`Invalid dataTypeKey: ${dataTypeKey}. Check SHEET_HEADERS configuration.`);
      return false;
    }

    const headers = SHEET_HEADERS[dataTypeKey.toUpperCase()];
    const formattedData = formatForSheets(appData, headers);
    const range = `${sheetName}!A1`; // Selalu mulai dari A1 untuk overwrite

    // Overwrite seluruh sheet dengan data baru (termasuk header baru)
    const success = await updateSheetRange(range, formattedData);
    
    // Optionally, if you want to clear old rows beyond the new data
    // You might need to fetch the current sheet size and clear remaining rows
    // For simplicity, we just overwrite from A1.

    if (success) {
      console.log(`Successfully exported ${appData.length} records to ${sheetName} as ${dataTypeKey} data.`);
    }

    return success;
  }, [updateSheetRange]);

  // Import data from sheet to app format (array of objects)
  // Membaca data mentah dari sheet dan mengkonversinya menjadi array of objects
  const importDataFromSheet = useCallback(async (range, dataTypeKey) => {
    if (!SHEET_HEADERS[dataTypeKey.toUpperCase()]) {
      setError(`Invalid dataTypeKey: ${dataTypeKey}. Check SHEET_HEADERS configuration.`);
      return [];
    }
    
    const headers = SHEET_HEADERS[dataTypeKey.toUpperCase()];
    const rawData = await fetchDataFromSheet(range); // Mengambil data mentah (2D array)
    
    if (!rawData || rawData.length <= 1) { // rawData[0] adalah header
        // Jika hanya ada header atau tidak ada data sama sekali
        return []; 
    }

    // Mengkonversi 2D array (tanpa header pertama) menjadi array of objects
    const dataObjects = rawData.slice(1).map((row, index) => {
      const obj = {};
      headers.forEach((header, hIndex) => {
        let value = row[hIndex];
        // Tambahkan logika konversi tipe data yang lebih spesifik jika diperlukan
        // Contoh: konversi string 'true'/'false' ke boolean, atau string angka ke number
        if (header.includes('harga') || header.includes('amount') || header.includes('total') || header.includes('fee')) {
          obj[header] = parseFloat(value) || 0;
        } else if (header.includes('stok') || header.includes('qty') || header.includes('tenor')) {
          obj[header] = parseInt(value) || 0;
        } else if (header.includes('tanggal') || header.includes('date') || header.includes('at')) {
          obj[header] = value ? new Date(value).toISOString() : null; // Simpan sebagai ISO string
        } else if (header === 'id' || header.includes('_id')) {
          obj[header] = value?.toString() || `temp_id_${index}`; // Pastikan ID adalah string
        } else {
          obj[header] = value || '';
        }
      });
      return obj;
    });

    console.log(`Successfully imported ${dataObjects.length} records from ${range} as ${dataTypeKey} data.`);
    return dataObjects;
  }, [fetchDataFromSheet]);

  // Auto-sync effect (optional): Fetch data when component mounts if authenticated
  useEffect(() => {
    if (isAuthenticated && spreadsheetId) {
      // Panggil fetchDataFromSheet atau importDataFromSheet dengan range dan type yang sesuai
      // Misalnya, untuk me-load data produk default
      // importDataFromSheet('Products!A:Z', 'PRODUCTS'); 
    }
  }, [isAuthenticated, spreadsheetId]); // Dependencies tanpa fetchDataFromSheet atau importDataFromSheet untuk mencegah loop

  return {
    data, // Raw 2D array dari fetch (gunakan fetchDataFromSheet jika ingin raw data)
    loading,
    error,
    lastUpdated,
    fetchDataFromSheet, // Untuk mengambil data mentah (2D array)
    appendDataToSheet, // Untuk menambah baris baru (2D array)
    updateSheetRange,  // Untuk update range spesifik (2D array)
    exportDataToSheet, // Untuk export array of objects ke sheet (menggunakan headers)
    importDataFromSheet, // Untuk import dari sheet ke array of objects (menggunakan headers)
    isReady: isAuthenticated && !!spreadsheetId // Siap untuk interaksi Sheets
  };
};