import React, { useState } from "react";

const SuratJalan = () => {
  const [formData, setFormData] = useState({
    noSurat: "",
    customer: "",
    produk: "",
    qty: "",
    driver: "",
  });

  const [dataList, setDataList] = useState([]);
  const [showStruk, setShowStruk] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAdd = () => {
    setDataList([...dataList, { ...formData, id: Date.now() }]);
    setFormData({ noSurat: "", customer: "", produk: "", qty: "", driver: "" });
  };

  const handleDelete = (id) => setDataList(dataList.filter((item) => item.id !== id));

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Surat Jalan Pengiriman/Returt Barang Mila Phone</h1>

      {/* Form Input */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <input name="noSurat" value={formData.noSurat} onChange={handleChange} placeholder="No Surat Jalan" className="border p-2 rounded" />
        <input name="customer" value={formData.customer} onChange={handleChange} placeholder="Customer" className="border p-2 rounded" />
        <input name="produk" value={formData.produk} onChange={handleChange} placeholder="Produk" className="border p-2 rounded" />
        <input name="qty" value={formData.qty} onChange={handleChange} placeholder="Qty" className="border p-2 rounded" />
        <input name="driver" value={formData.driver} onChange={handleChange} placeholder="Driver" className="border p-2 rounded" />
      </div>
      <button onClick={handleAdd} className="bg-green-500 text-white px-4 py-2 rounded">Tambah</button>

      {/* Tabel Data */}
      <table className="w-full mt-6 border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-2">No Surat</th>
            <th className="border px-2">Customer</th>
            <th className="border px-2">Produk</th>
            <th className="border px-2">Qty</th>
            <th className="border px-2">Driver</th>
            <th className="border px-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {dataList.map((item) => (
            <tr key={item.id}>
              <td className="border px-2">{item.noSurat}</td>
              <td className="border px-2">{item.customer}</td>
              <td className="border px-2">{item.produk}</td>
              <td className="border px-2">{item.qty}</td>
              <td className="border px-2">{item.driver}</td>
              <td className="border px-2">
                <button className="bg-blue-500 text-white px-2 py-1 rounded mr-2">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="bg-red-500 text-white px-2 py-1 rounded">Hapus</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tombol Review Cetak */}
      <button onClick={() => setShowStruk(true)} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded">Review Cetak</button>

      {/* Preview Struk */}
      {showStruk && (
        <div className="mt-6 border p-4 w-80">
          <h2 className="text-center font-bold">SURAT JALAN</h2>
          <h3 className="text-center mb-4">MILAPHONE TAPOS</h3>
          {dataList.map((item) => (
            <div key={item.id} className="mb-4 text-sm">
              <p>No Surat: {item.noSurat}</p>
              <p>Customer: {item.customer}</p>
              <p>Produk: {item.produk}</p>
              <p>Qty: {item.qty}</p>
              <p>Driver: {item.driver}</p>
              <hr className="my-2" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuratJalan;
