import React, { useState } from "react";

const StrukPenjualanIMEI = () => {
  const [formData, setFormData] = useState({
    noFaktur: "",
    imei: "",
    produk: "",
    customer: "",
    sales: "",
  });

  const [dataList, setDataList] = useState([]);
  const [showStruk, setShowStruk] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAdd = () => {
    setDataList([...dataList, { ...formData, id: Date.now() }]);
    setFormData({ noFaktur: "", imei: "", produk: "", customer: "", sales: "" });
  };

  const handleDelete = (id) => {
    setDataList(dataList.filter((item) => item.id !== id));
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Struk IMEI Mila Phone</h1>

      {/* Form Input */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <input name="noFaktur" value={formData.noFaktur} onChange={handleChange} placeholder="No Faktur" className="border p-2 rounded" />
        <input name="imei" value={formData.imei} onChange={handleChange} placeholder="IMEI" className="border p-2 rounded" />
        <input name="produk" value={formData.produk} onChange={handleChange} placeholder="Produk" className="border p-2 rounded" />
        <input name="customer" value={formData.customer} onChange={handleChange} placeholder="Customer" className="border p-2 rounded" />
        <input name="sales" value={formData.sales} onChange={handleChange} placeholder="Sales" className="border p-2 rounded" />
      </div>
      <button onClick={handleAdd} className="bg-green-500 text-white px-4 py-2 rounded">Tambah</button>

      {/* Tabel Data */}
      <table className="w-full mt-6 border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-2">No Faktur</th>
            <th className="border px-2">IMEI</th>
            <th className="border px-2">Produk</th>
            <th className="border px-2">Customer</th>
            <th className="border px-2">Sales</th>
            <th className="border px-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {dataList.map((item) => (
            <tr key={item.id}>
              <td className="border px-2">{item.noFaktur}</td>
              <td className="border px-2">{item.imei}</td>
              <td className="border px-2">{item.produk}</td>
              <td className="border px-2">{item.customer}</td>
              <td className="border px-2">{item.sales}</td>
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
          <h2 className="text-center font-bold">STRUK IMEI</h2>
          <h3 className="text-center mb-4">MILAPHONE TAPOS</h3>
          {dataList.map((item) => (
            <div key={item.id} className="mb-4 text-sm">
              <p>No Faktur: {item.noFaktur}</p>
              <p>Customer: {item.customer}</p>
              <p>Sales: {item.sales}</p>
              <p>Produk: {item.produk}</p>
              <p>IMEI: {item.imei}</p>
              <hr className="my-2" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StrukPenjualanIMEI;
