import React, { useState, useEffect, useCallback } from 'react';
import { useGoogleSheets } from '../../hooks/useGoogleSheets';
import { useGoogleDrive } from '../../hooks/useGoogleDrive';
import { useAuth } from '../GoogleAuth/AuthContext';
import GoogleAuth from '../GoogleAuth/GoogleAuth';
import { 
  SHEET_HEADERS // <-- IMPORT SHEET_HEADERS
} from '../../utils/dataTransformers';
import './DataManager.css';

const DataManager = ({ 
  appData = [], 
  setAppData, 
  dataType = 'SALES', // Default ke 'SALES' atau sesuaikan dengan default yang paling sering
  tokoId = null,
  allowedActions = ['export', 'import', 'backup', 'restore']
}) => {
  const { isAuthenticated, userProfile } = useAuth();
  const { 
    data: sheetRawData, // Raw 2D array from sheet (bukan array of objects)
    loading: sheetsLoading, 
    error: sheetsError, 
    exportDataToSheet, 
    importDataFromSheet, // Sudah mengkonversi ke array of objects
    lastUpdated 
  } = useGoogleSheets();
  
  const { 
    driveLoading, 
    driveError, 
    backupAppDataToDrive, 
    restoreAppDataFromDrive,
    uploadedFiles,
    listDriveFiles // Tambahkan ini untuk menampilkan daftar backup
  } = useGoogleDrive();

  const [localAppData, setLocalAppData] = useState(appData);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showFiles, setShowFiles] = useState(false);
  const [driveBackups, setDriveBackups] = useState([]); // State untuk daftar backup dari Drive

  // Sync local data with appData prop
  useEffect(() => {
    setLocalAppData(appData);
  }, [appData]);

  // Fetch list of drive backups when component mounts or auth status changes
  useEffect(() => {
    if (isAuthenticated) {
      const fetchBackups = async () => {
        const query = `name contains 'backup_mila_phone_${dataType}' and mimeType = 'text/csv'`;
        const files = await listDriveFiles(null, query); // List file tanpa folderId spesifik
        setDriveBackups(files);
      };
      fetchBackups();
    }
  }, [isAuthenticated, listDriveFiles, dataType]);


  // ==================== Sheets Operations ====================\

  const handleImportFromSheets = async () => {
    if (!isAuthenticated) {
      setStatusMessage('⚠️ Silakan login dengan Google terlebih dahulu.');
      return;
    }

    setStatusMessage('📥 Mengimpor data dari Google Sheets...');
    
    try {
      const sheetName = getSheetName(dataType, tokoId);
      const importedData = await importDataFromSheet(`${sheetName}!A:Z`, dataType); // <-- Gunakan dataType di sini
      
      if (importedData && importedData.length > 0) {
        setLocalAppData(importedData); // Update state lokal
        if (setAppData) { // Jika ada setter dari parent, panggil
          setAppData(importedData); 
        }
        setStatusMessage(`✅ Berhasil mengimpor ${importedData.length} record dari ${sheetName}.`);
      } else {
        setStatusMessage('⚠️ Tidak ada data di Google Sheets atau data kosong.');
      }
    } catch (error) {
      setStatusMessage(`❌ Error saat impor dari Sheets: ${error.message}`);
      console.error('Import Sheets error:', error);
    }
  };

  const handleExportToSheets = async () => {
    if (!isAuthenticated) {
      setStatusMessage('⚠️ Silakan login dengan Google terlebih dahulu.');
      return;
    }

    if (!localAppData || localAppData.length === 0) {
      setStatusMessage('⚠️ Tidak ada data untuk diekspor.');
      return;
    }

    setStatusMessage('📤 Mengekspor data ke Google Sheets...');
    
    try {
      const sheetName = getSheetName(dataType, tokoId);
      const success = await exportDataToSheet(localAppData, sheetName, dataType); // <-- Gunakan dataType di sini
      
      if (success) {
        setStatusMessage(`✅ Data berhasil diekspor ke ${sheetName}!`);
      } else {
        setStatusMessage('❌ Gagal mengekspor ke Google Sheets.');
      }
    } catch (error) {
      setStatusMessage(`❌ Error saat ekspor ke Sheets: ${error.message}`);
      console.error('Export Sheets error:', error);
    }
  };


  // ==================== Drive Operations ====================\

  const handleBackupToDrive = async () => {
    if (!isAuthenticated) {
      setStatusMessage('⚠️ Silakan login dengan Google terlebih dahulu.');
      return;
    }

    if (!localAppData || localAppData.length === 0) {
      setStatusMessage('⚠️ Tidak ada data untuk backup.');
      return;
    }

    setStatusMessage('💾 Membuat backup ke Google Drive...');
    
    try {
      const backupFile = await backupAppDataToDrive(localAppData, dataType, `mila_phone_data_${tokoId || 'all'}`); // <-- Gunakan dataType di sini
      
      if (backupFile) {
        setStatusMessage(`✅ Backup berhasil! File ID: ${backupFile.id}`);
        // Refresh daftar backup setelah backup baru
        const query = `name contains 'backup_mila_phone_${dataType}' and mimeType = 'text/csv'`;
        const files = await listDriveFiles(null, query);
        setDriveBackups(files);
        setShowFiles(true); // Tampilkan daftar file setelah backup
      } else {
        setStatusMessage('❌ Gagal membuat backup.');
      }
    } catch (error) {
      setStatusMessage(`❌ Error saat backup ke Drive: ${error.message}`);
      console.error('Backup Drive error:', error);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!selectedFileId) {
      setStatusMessage('⚠️ Pilih file backup terlebih dahulu.');
      return;
    }

    if (!isAuthenticated) {
      setStatusMessage('⚠️ Silakan login dengan Google terlebih dahulu.');
      return;
    }

    setStatusMessage('🔄 Memulihkan data dari backup...');
    
    try {
      const restoredData = await restoreAppDataFromDrive(selectedFileId);
      
      if (restoredData && restoredData.length > 0) {
        setLocalAppData(restoredData);
        if (setAppData) {
          setAppData(restoredData);
        }
        setStatusMessage(`✅ Data berhasil dipulihkan! ${restoredData.length} record.`);
      } else {
        setStatusMessage('⚠️ File backup kosong atau tidak valid.');
      }
    } catch (error) {
      setStatusMessage(`❌ Error saat restore dari Drive: ${error.message}`);
      console.error('Restore Drive error:', error);
    }
  };

  // Helper: Get appropriate sheet name based on data type and toko
  const getSheetName = useCallback((type, currentTokoId) => {
    // Sesuaikan dengan nama sheet di Google Sheets Anda
    const baseNames = {
      products: 'Products',
      sales: 'Sales',
      inventory: 'Inventory',
      users: 'Users',
      stock_accessories: 'StockAccessories',
      stock_handphone: 'StockHandphone',
      stock_motor_listrik: 'StockMotorListrik',
      finance_report: 'FinanceReport'
      // Tambahkan tipe data lain jika ada
    };
    
    const name = baseNames[type.toLowerCase()] || 'Data_Default'; // Default jika type tidak ditemukan
    return currentTokoId ? `${name}_${currentTokoId}` : name;
  }, []);

  // Render data preview (menggunakan localAppData)
  const renderDataPreview = useCallback(() => {
    if (sheetsLoading || driveLoading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading...</span>
        </div>
      );
    }

    if (!localAppData || localAppData.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Tidak ada data untuk ditampilkan</p>
          <p className="text-sm">Gunakan tombol import atau export untuk mengelola data</p>
        </div>
      );
    }

    // Ambil headers dari SHEET_HEADERS sesuai dengan dataType
    const headers = SHEET_HEADERS[dataType.toUpperCase()] || Object.keys(localAppData[0] || {});
    // Batasi preview hanya 5 baris
    const previewData = localAppData.slice(0, 5);

    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full bg-white border-collapse">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((key) => (
                <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {key.replace(/_/g, ' ')} {/* Format header agar lebih mudah dibaca */}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {previewData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {headers.map((key) => (
                  <td key={key} className="px-4 py-2 text-sm text-gray-900">
                    {item[key]?.toString() || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {localAppData.length > 5 && (
          <p className="text-center text-sm text-gray-600 mt-2">
            Menampilkan 5 dari {localAppData.length} record.
          </p>
        )}
      </div>
    );
  }, [localAppData, sheetsLoading, driveLoading, dataType]);


  // Render status messages
  const renderStatus = () => {
    if (!statusMessage) return null;
    return (
      <div className={`mb-4 p-3 rounded-md text-sm ${
        statusMessage.includes('✅') ? 'bg-green-50 border border-green-200 text-green-800' :
        statusMessage.includes('❌') ? 'bg-red-50 border border-red-200 text-red-800' :
        statusMessage.includes('⚠️') ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
        'bg-blue-50 border border-blue-200 text-blue-800'
      }`}>
        {statusMessage}
      </div>
    );
  };

  // Render Google auth status
  const renderAuthStatus = () => {
    if (!isAuthenticated) {
      return (
        <div className="mb-6 p-4 border border-yellow-200 bg-yellow-50 rounded-lg flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-md font-semibold text-yellow-800 mb-1">Google Integration</h3>
            <p className="text-sm text-yellow-700">
              Login dengan Google untuk mengaktifkan fitur export, import, dan backup data.
            </p>
          </div>
          <GoogleAuth className="ml-auto" onAuthChange={(status) => {
            if (status) setStatusMessage('✅ Berhasil terhubung ke Google.');
            else setStatusMessage('⚠️ Gagal terhubung ke Google.');
          }} />
        </div>
      );
    } else {
      return (
        <div className="mb-6 p-4 border border-green-200 bg-green-50 rounded-lg flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-md font-semibold text-green-800 mb-1">Google Integration</h3>
            <p className="text-sm text-green-700">
              Terhubung ke Google ({userProfile?.name})
            </p>
            {lastUpdated && (
              <p className="text-xs text-green-700 mt-1">
                Sheets terakhir disinkron: {lastUpdated.toLocaleString('id-ID')}
              </p>
            )}
          </div>
          <GoogleAuth className="ml-auto" />
        </div>
      );
    }
  };


  return (
    <div className="data-manager p-6 bg-white rounded-lg shadow-md max-w-full mx-auto my-4">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Pengelolaan Data - {getSheetName(dataType, tokoId)}
        </h2>
        <p className="text-gray-600">
          Export, import, dan backup data {dataType} ke Google Sheets & Drive
        </p>
      </div>

      {/* Auth Status */}
      {renderAuthStatus()}

      {/* Status Messages */}
      {renderStatus()}

      {/* Action Buttons */}
      {isAuthenticated && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {allowedActions.includes('export') && (
            <button
              onClick={handleExportToSheets}
              disabled={sheetsLoading || !localAppData || localAppData.length === 0}
              className="btn-export flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              <span>
                {sheetsLoading ? 'Mengekspor...' : `Export ke Sheets (${localAppData?.length || 0} items)`}
              </span>
            </button>
          )}

          {allowedActions.includes('import') && (
            <button
              onClick={handleImportFromSheets}
              disabled={sheetsLoading}
              className="btn-import flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              <span>
                {sheetsLoading ? 'Mengimpor...' : 'Import dari Sheets'}
              </span>
            </button>
          )}

          {allowedActions.includes('backup') && (
            <button
              onClick={handleBackupToDrive}
              disabled={driveLoading || !localAppData || localAppData.length === 0}
              className="btn-backup flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>
                {driveLoading ? 'Membuat backup...' : `Backup ke Drive (${localAppData?.length || 0} items)`}
              </span>
            </button>
          )}

          {allowedActions.includes('restore') && (
            <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-2 md:space-y-0 md:space-x-2">
              <select
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
                disabled={driveLoading || driveBackups.length === 0}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">-- Pilih file backup dari Drive --</option>
                {driveBackups.map(file => (
                  <option key={file.id} value={file.id}>
                    {file.name} ({new Date(file.createdTime).toLocaleDateString()})
                  </option>
                ))}
              </select>
              <button
                onClick={handleRestoreFromDrive}
                disabled={driveLoading || !selectedFileId}
                className="btn-restore px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {driveLoading ? 'Memulihkan...' : 'Restore'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {(sheetsError || driveError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {sheetsError || driveError}
          </p>
          {!isAuthenticated && (
            <p className="text-xs text-red-700 mt-1">
              Pastikan Anda sudah login dengan Google dan spreadsheet ID sudah benar.
            </p>
          )}
        </div>
      )}

      {/* Data Preview */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Preview Data ({localAppData?.length || 0} items)</h3>
        </div>
        {renderDataPreview()}
      </div>
    </div>
  );
};

export default DataManager;