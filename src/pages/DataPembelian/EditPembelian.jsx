import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';


const EditPembelian = () => {
    const navigate = useNavigate();
  const [formData, setFormData] = useState({
    namaPelanggan: '',
    namaSales: '',
    nomorEmei: '',
    nomorTelepon: '',
    harga: '',
    tipeHandphone: '',
    garansi: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Logic for handling form submission
    console.log('Data Penjualan Ditambahkan:', formData);
  };

  return (
    <div className="p-6 bg-gray-100 h-screen">
      <h1 className="text-2xl font-bold mb-6">Edit Data Penjualan</h1>
      {/* Form Edit Data Penjualan */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 shadow-md rounded">
        <div>
        <h1 className="text-2xl font-bold mb-4">Form Edit Penjualan</h1>
        
          <label className="block mb-2">Nama Pelanggan</label>
          <input
            type="text"
            name="namaPelanggan"
            value={formData.namaPelanggan}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block mb-2">Nama Sales</label>
          <input
            type="text"
            name="namaSales"
            value={formData.namaSales}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block mb-2">Nomor Emei</label>
          <input
            type="text"
            name="nomorEmei"
            value={formData.nomorEmei}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block mb-2">Nomor Telepon</label>
          <input
            type="text"
            name="nomorTelepon"
            value={formData.nomorTelepon}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block mb-2">Harga</label>
          <input
            type="text"
            name="harga"
            value={formData.harga}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block mb-2">Tipe Handphone</label>
          <input
            type="text"
            name="tipeHandphone"
            value={formData.tipeHandphone}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block mb-2">Garansi</label>
          <input
            type="text"
            name="garansi"
            value={formData.garansi}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <button type="submit" className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-green-600">
          Edit Penjualan
        </button>
        <button
        onClick={() => navigate(-1)}
        className="mb-2 px-4 py-2 ml-4 bg-green-700 text-white rounded hover:bg-gray-700"
      >
        Kembali
      </button>
      </form>
      <div className="bg-white p-6 shadow-md rounded">
        <p>Form untuk edit data penjualan...</p>
      </div>
    </div>
  );
};

export default EditPembelian;
