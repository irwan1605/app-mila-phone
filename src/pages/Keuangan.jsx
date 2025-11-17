import React, { useState } from 'react';
import { CSVLink } from 'react-csv';
import { useNavigate } from 'react-router-dom';


const KeuanganMenu = () => {
 
  const [dataPenjualan, setDataPenjualan] = useState([
    { id: 1, namaPelanggan: 'Budi', namaSales: 'Dewi', jenisPenjualan: 'Handphone', harga: 5000000, tanggal: '2024-10-01', emeiHp: '123456789012345', nomorMesin: '' },
    { id: 2, namaPelanggan: 'Andi', namaSales: 'Rina', jenisPenjualan: 'Motor Listrik', harga: 10000000, tanggal: '2024-10-02', emeiHp: '', nomorMesin: 'ML1234567890' },
  ]);

  const [newData, setNewData] = useState({
    id: '',
    namaPelanggan: '',
    namaSales: '',
    jenisPenjualan: '',
    harga: '',
    tanggal: '',
    emeiHp: '',
    nomorMesin: ''
  });

  const [isFullScreen, setIsFullScreen] = useState(false);

  // Menghitung total penjualan
  const totalPenjualan = dataPenjualan.reduce((acc, item) => acc + parseInt(item.harga), 0);
  const navigate = useNavigate();
  const handleClose = () => {
    navigate('/dashboard'); // Ganti '/' dengan path yang diinginkan
  };
  // Header untuk file CSV
  const headers = [
    { label: 'ID', key: 'id' },
    { label: 'Nama Pelanggan', key: 'namaPelanggan' },
    { label: 'Nama Sales', key: 'namaSales' },
    { label: 'Jenis Penjualan', key: 'jenisPenjualan' },
    { label: 'Harga (Rp)', key: 'harga' },
    { label: 'Tanggal', key: 'tanggal' },
    { label: 'Nomor Emei HP', key: 'emeiHp' },
    { label: 'Nomor Mesin Motor Listrik', key: 'nomorMesin' },
  ];

  // Handler untuk input perubahan
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handler untuk menambah data ke tabel
  const handleAddData = () => {
    const newId = dataPenjualan.length + 1;
    const updatedData = { ...newData, id: newId };
    setDataPenjualan([...dataPenjualan, updatedData]);

    // Reset form input
    setNewData({
      id: '',
      namaPelanggan: '',
      namaSales: '',
      jenisPenjualan: '',
      harga: '',
      tanggal: '',
      emeiHp: '',
      nomorMesin: ''
    });
  };

  // Handler untuk menghapus data dari tabel
  const handleDelete = (id) => {
    setDataPenjualan(dataPenjualan.filter((item) => item.id !== id));
  };

  // Handler untuk mengedit data dalam tabel
  const handleEdit = (id) => {
    const itemToEdit = dataPenjualan.find((item) => item.id === id);
    setNewData(itemToEdit);
    handleDelete(id); // Hapus data yang sedang diedit, kemudian tambahkan yang baru.
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
      <h2 className="text-2xl font-bold mb-4">Laporan Keuangan Mila Phone</h2>

      {/* Form Input */}
      <div className="mb-4">
        <h3 className="text-xl mb-2">Tambah Data Penjualan</h3>
        <input
          type="text"
          name="namaPelanggan"
          value={newData.namaPelanggan}
          onChange={handleInputChange}
          placeholder="Nama Pelanggan"
          className="border p-2 mr-2"
        />
        <input
          type="text"
          name="namaSales"
          value={newData.namaSales}
          onChange={handleInputChange}
          placeholder="Nama Sales"
          className="border p-2 mr-2"
        />
        <input
          type="text"
          name="jenisPenjualan"
          value={newData.jenisPenjualan}
          onChange={handleInputChange}
          placeholder="Jenis Penjualan"
          className="border p-2 mr-2"
        />
        <input
          type="number"
          name="harga"
          value={newData.harga}
          onChange={handleInputChange}
          placeholder="Harga"
          className="border p-2 mr-2"
        />
        <input
          type="date"
          name="tanggal"
          value={newData.tanggal}
          onChange={handleInputChange}
          placeholder="Tanggal"
          className="border p-2 mr-2"
        />
        <input
          type="text"
          name="emeiHp"
          value={newData.emeiHp}
          onChange={handleInputChange}
          placeholder="Nomor Emei HP"
          className="border p-2 mr-2"
        />
        <input
          type="text"
          name="nomorMesin"
          value={newData.nomorMesin}
          onChange={handleInputChange}
          placeholder="Nomor Mesin Motor Listrik"
          className="border p-2 mr-2"
        />
        <button onClick={handleAddData} className="bg-green-500 text-white px-4 py-2 rounded">
          Tambah Data
        </button>
      </div>

      {/* Tabel Data Penjualan */}
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
            <th className="px-4 py-2">Action</th>
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
              <td className="border px-4 py-2">
                <button onClick={() => handleEdit(item.id)} className="bg-yellow-500 text-white px-2 py-1 mr-2 rounded">
                  Edit
                </button>
                <button onClick={() => handleDelete(item.id)} className="bg-red-500 text-white px-2 py-1 rounded">
                  Hapus
                </button>
              </td>
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
            <td className="border px-4 py-2"></td>
          </tr>
        </tbody>
      </table>

      {/* Tombol Download dan Review Cetak */}
      <div className="flex mb-4">
        <CSVLink
          data={dataPenjualan}
          headers={headers}
          filename="laporan_keuangan.csv"
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          Download Excel
        </CSVLink>
        <button onClick={handleFullScreen} className="bg-gray-500 text-white px-4 py-2 rounded mr-2">
          {isFullScreen ? 'Kembali' : 'Review Cetak'}
        </button>
      </div>

      {/* Modal untuk Review Cetak */}
      {isFullScreen && (
        <div className="fixed inset-0 bg-white z-50 p-6">
          <h2 className="text-2xl font-bold mb-4">Cetak Data Penjualan</h2>
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
      className="px-4 py-2 mb-2 bg-gray-500 text-white rounded"
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

export default KeuanganMenu;
