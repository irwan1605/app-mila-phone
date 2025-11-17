import { useState, useCallback } from 'react';
import { useAuth } from '../components/GoogleAuth/AuthContext';
import { convertArrayOfObjectsToCSV, convertCSVToArrayOfObjects, SHEET_HEADERS } from '../utils/dataTransformers'; // <-- IMPORT SHEET_HEADERS

export const useGoogleDrive = () => {
  const { accessToken, isAuthenticated } = useAuth();
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]); // Untuk melacak file yang baru diupload

  // Upload file to Google Drive
  const uploadFile = useCallback(async (fileName, content, mimeType = 'text/csv', folderId = null) => {
    if (!isAuthenticated || !accessToken) {
      setDriveError('User not authenticated or access token not available.');
      return null;
    }

    setDriveLoading(true);
    setDriveError(null);

    try {
      const form = new FormData();
      
      // Metadata file
      const metadata = {
        name: fileName,
        mimeType,
        parents: folderId ? [folderId] : undefined // Jika ada folderId, masukkan ke dalam array parents
      };
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      
      // Konten file
      form.append('file', new Blob([content], { type: mimeType }));

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
      }

      const file = await response.json();
      console.log('File uploaded to Drive:', file.id, file.name);
      
      // Tambahkan ke daftar file yang baru diupload
      setUploadedFiles(prev => [...prev, { id: file.id, name: file.name, uploadedAt: new Date() }]);
      
      return file; // Mengembalikan objek file yang diupload
    } catch (err) {
      console.error('Drive upload error:', err);
      setDriveError(err.message);
      return null;
    } finally {
      setDriveLoading(false);
    }
  }, [isAuthenticated, accessToken]); // Dependencies untuk useCallback

  // Download file from Google Drive
  const downloadFile = useCallback(async (fileId, asText = true) => {
    if (!isAuthenticated || !accessToken) {
      setDriveError('User not authenticated or access token not available.');
      return null;
    }

    setDriveLoading(true);
    setDriveError(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, // `alt=media` untuk mendownload konten file
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
      }

      const content = asText ? await response.text() : await response.blob();
      console.log('File downloaded from Drive:', fileId);
      return content;
    } catch (err) {
      console.error('Drive download error:', err);
      setDriveError(err.message);
      return null;
    } finally {
      setDriveLoading(false);
    }
  }, [isAuthenticated, accessToken]); // Dependencies untuk useCallback

  // Backup app data (e.g., array of objects) to Drive as a CSV file
  const backupAppDataToDrive = useCallback(async (appData, dataTypeKey, fileNamePrefix = 'backup_mila_phone') => {
    if (!appData || appData.length === 0) {
      setDriveError('No data to backup.');
      return null;
    }
    if (!SHEET_HEADERS[dataTypeKey.toUpperCase()]) {
      setDriveError(`Invalid dataTypeKey: ${dataTypeKey}. Check SHEET_HEADERS configuration.`);
      return null;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `${fileNamePrefix}_${dataTypeKey}_${timestamp}.csv`;
    
    // Gunakan headers yang sesuai dari SHEET_HEADERS untuk CSV
    const headers = SHEET_HEADERS[dataTypeKey.toUpperCase()];
    const csvContent = convertArrayOfObjectsToCSV(appData, headers);

    // Panggil fungsi uploadFile
    return await uploadFile(fileName, csvContent, 'text/csv');
  }, [uploadFile]); // Dependencies: fungsi uploadFile itu sendiri

  // Restore app data from a CSV file in Drive
  const restoreAppDataFromDrive = useCallback(async (fileId) => {
    const csvContent = await downloadFile(fileId, true); // Download sebagai teks (CSV)
    if (!csvContent) return null;

    // Asumsi format CSV mengandung header di baris pertama
    // convertCSVToArrayOfObjects akan membaca header dari CSV itu sendiri
    const restoredData = convertCSVToArrayOfObjects(csvContent);
    console.log('Data restored from Drive:', restoredData.length, 'records');
    return restoredData;
  }, [downloadFile]); // Dependencies: fungsi downloadFile itu sendiri

  // List files in a Drive folder (or all files if no folderId specified)
  const listDriveFiles = useCallback(async (folderId = null, query = null) => {
    if (!isAuthenticated || !accessToken) {
      setDriveError('User not authenticated or access token not available.');
      return [];
    }

    setDriveLoading(true);
    setDriveError(null);

    try {
      let url = 'https://www.googleapis.com/drive/v3/files';
      const params = new URLSearchParams({
        pageSize: 50, // Sesuaikan jumlah item yang ingin diambil
        fields: 'files(id,name,createdTime,mimeType,size)', // Fields yang ingin diambil
        orderBy: 'createdTime desc' // Urutkan berdasarkan waktu pembuatan terbaru
      });

      let q = [];
      if (folderId) {
        q.push(`'${folderId}' in parents`);
      }
      if (query) {
        // Contoh query: "name contains 'backup'"
        q.push(query);
      }
      // Hanya tampilkan file yang bukan trash
      q.push("trashed = false");

      if (q.length > 0) {
        params.append('q', q.join(' and '));
      }

      const response = await fetch(
        `${url}?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      return result.files || [];
    } catch (err) {
      console.error('Drive list error:', err);
      setDriveError(err.message);
      return [];
    } finally {
      setDriveLoading(false);
    }
  }, [isAuthenticated, accessToken]); // Dependencies untuk useCallback

  return {
    driveLoading,
    driveError,
    uploadedFiles, // Mengembalikan daftar file yang baru diupload
    uploadFile,
    downloadFile,
    backupAppDataToDrive,
    restoreAppDataFromDrive,
    listDriveFiles,
    isReady: isAuthenticated // Siap untuk interaksi Drive
  };
};