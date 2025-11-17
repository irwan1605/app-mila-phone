import React, { useState } from 'react';
import { CSVLink } from 'react-csv';
import { useNavigate } from 'react-router-dom';


const CetakPenjualan = () => {
 
  
  const navigate = useNavigate();
  const handleClose = () => {
    navigate('/dashboard'); // Ganti '/' dengan path yang diinginkan
  };

   // Handler untuk mencetak tabel
   const handlePrint = () => {
    window.print();
  };

  // Handler untuk layar penuh
  const handleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };
  
  return (
    <div className={`p-6 ${isFullScreen ? 'fixed inset-0 bg-white z-50 overflow-auto' : ''}`}>
      

      {/* Modal untuk Review Cetak */}
      {isFullScreen && (
        <div className="fixed inset-0 bg-white z-50 p-6">
          <h2 className="text-2xl font-bold mb-4">Cetak Data Penjualan Mila Phone</h2>
          <table className="table-auto w-full mb-4 border">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Nama Pelanggan</th>
                <th className="px-4 py-2">Nama Sales</th>
                <th className="px-4 py-2">Jenis Penjualan</th>
                <th className="px-4 py-2">Harga (Rp)</th>
                <th className="px-4 py-2">Tanggal</th>
                <th className="px-4 py-2">Nomor Emei HP</th>
                <th className="px-4 py-2">Nomor Mesin</th>
              </tr>
            </thead>
            <tbody>
              {dataPenjualan.map((item) => (
                <tr key={item.id}>
                  <td className="border px-4 py-2">{item.id}</td>
                  <td className="border px-4 py-2">{item.namaPelanggan}</td>
                  <td className="border px-4 py-2">{item.namaSales}</td>
                  <td className="border px-4 py-2">{item.jenisPenjualan}</td>
                  <td className="border px-4 py-2">Rp {item.harga.toLocaleString()}</td>
                  <td className="border px-4 py-2">{item.tanggal}</td>
                  <td className="border px-4 py-2">{item.emeiHp}</td>
                  <td className="border px-4 py-2">{item.nomorMesin}</td>
                </tr>
              ))}
              <tr>
                <td className="border px-4 py-2"></td>
                <td className="border px-4 py-2"></td>
                <td className="border px-4 py-2"></td>
                <td className="border px-4 py-2"></td>
                <td className="border px-4 py-2 font-bold">Total</td>
                <td className="border px-4 py-2 font-bold">Rp {totalPenjualan.toLocaleString()}</td>
                <td className="border px-4 py-2"></td>
                <td className="border px-4 py-2"></td>
              </tr>
            </tbody>
          </table>
          <button 
      onClick={handleClose} 
      className="flex mb-4 px-4 py-2 mt-2 bg-gray-500 text-white rounded"
    >
      Tutup Halaman
    </button>
          
          <button onClick={handlePrint} className="bg-blue-500 text-white px-4 py-2 rounded">
            Print
          </button>
        
        </div>
      )}
    </div>
  );
};

export default CetakPenjualan;
