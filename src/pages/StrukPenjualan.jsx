import React, { useState } from "react";

const StrukPenjualan = () => {
  const [formData, setFormData] = useState({
    noFaktur: "SI-2025/06-0600",
    pelanggan: "CASH",
    sales: "AHMAD RUJAI",
    bayar: 0,
  });

  const [barang, setBarang] = useState([]);
  const [item, setItem] = useState({ nama: "", harga: "", qty: "" });
  const [reviewMode, setReviewMode] = useState(false);

  // handle input umum
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // handle input barang
  const handleItemChange = (e) => {
    setItem({ ...item, [e.target.name]: e.target.value });
  };

  // tambah barang
  const handleAddItem = () => {
    if (!item.nama || !item.harga || !item.qty) return;
    setBarang([...barang, { ...item, harga: parseFloat(item.harga), qty: parseInt(item.qty) }]);
    setItem({ nama: "", harga: "", qty: "" });
  };

  // hapus barang
  const handleDelete = (index) => {
    setBarang(barang.filter((_, i) => i !== index));
  };

  // edit barang
  const handleEdit = (index) => {
    const barangEdit = barang[index];
    setItem(barangEdit);
    setBarang(barang.filter((_, i) => i !== index));
  };

  // hitung total
  const subtotal = barang.reduce((acc, cur) => acc + cur.harga * cur.qty, 0);
  const ppn = subtotal * 0.11;
  const total = subtotal + ppn;
  const kembali = formData.bayar - total;

  return (
    <div className="p-6">
      {!reviewMode ? (
        <div className="space-y-6"> <h1 className="text-xl font-bold mb-4">Struk Faktur Penjualan Mila Phone</h1>
          {/* FORM DATA PENJUALAN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              name="noFaktur"
              value={formData.noFaktur}
              onChange={handleChange}
              placeholder="No Faktur"
              className="border p-2 rounded"
            />
            <input
              type="text"
              name="pelanggan"
              value={formData.pelanggan}
              onChange={handleChange}
              placeholder="Pelanggan"
              className="border p-2 rounded"
            />
            <input
              type="text"
              name="sales"
              value={formData.sales}
              onChange={handleChange}
              placeholder="Sales"
              className="border p-2 rounded"
            />
            <input
              type="number"
              name="bayar"
              value={formData.bayar}
              onChange={handleChange}
              placeholder="Bayar"
              className="border p-2 rounded"
            />
          </div>

          {/* FORM BARANG */}
          <div className="flex gap-2">
            <input
              type="text"
              name="nama"
              value={item.nama}
              onChange={handleItemChange}
              placeholder="Nama Barang"
              className="border p-2 rounded w-1/3"
            />
            <input
              type="number"
              name="harga"
              value={item.harga}
              onChange={handleItemChange}
              placeholder="Harga"
              className="border p-2 rounded w-1/3"
            />
            <input
              type="number"
              name="qty"
              value={item.qty}
              onChange={handleItemChange}
              placeholder="Qty"
              className="border p-2 rounded w-1/6"
            />
            <button
              onClick={handleAddItem}
              className="bg-green-500 text-white px-4 rounded"
            >
              Tambah
            </button>
          </div>

          {/* TABEL BARANG */}
          <table className="w-full border mt-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Nama Barang</th>
                <th className="border p-2">Harga</th>
                <th className="border p-2">Qty</th>
                <th className="border p-2">Total</th>
                <th className="border p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {barang.map((b, i) => (
                <tr key={i}>
                  <td className="border p-2">{b.nama}</td>
                  <td className="border p-2">{b.harga.toLocaleString()}</td>
                  <td className="border p-2">{b.qty}</td>
                  <td className="border p-2">{(b.harga * b.qty).toLocaleString()}</td>
                  <td className="border p-2 flex gap-2 justify-center">
                    <button
                      onClick={() => handleEdit(i)}
                      className="bg-yellow-500 text-white px-2 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(i)}
                      className="bg-red-500 text-white px-2 rounded"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOMBOL CETAK */}
          <button
            onClick={() => setReviewMode(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Review Cetak
          </button>
        </div>
      ) : (
        /* HALAMAN CETAK STRUK */
        <div className="border p-6 w-[400px] mx-auto bg-white">
          <h2 className="text-center font-bold">FAKTUR PENJUALAN</h2>
          <p className="text-center">MILAPHONE TAPOS</p>

          <div className="mt-4 text-sm">
            <p>No. Faktur : {formData.noFaktur}</p>
            <p>Pelanggan : {formData.pelanggan}</p>
            <p>Sales : {formData.sales}</p>
          </div>

          <hr className="my-2" />

          <div className="text-sm">
            {barang.map((b, i) => (
              <p key={i}>
                {b.qty} x {b.harga.toLocaleString()} ={" "}
                {(b.qty * b.harga).toLocaleString()} ({b.nama})
              </p>
            ))}
          </div>

          <hr className="my-2" />
          <p>Total Item : {barang.length}</p>
          <p>Sub Total : {subtotal.toLocaleString()}</p>
          <p>PPN (11%) : {ppn.toLocaleString()}</p>
          <p>Total : {total.toLocaleString()}</p>
          <p>Bayar : {parseFloat(formData.bayar).toLocaleString()}</p>
          <p>Kembali : {kembali.toLocaleString()}</p>
          <p className="mt-2 text-xs">
            ({new Date().toLocaleString()})
          </p>

          <button
            onClick={() => setReviewMode(false)}
            className="mt-4 bg-gray-600 text-white px-4 py-2 rounded"
          >
            Kembali
          </button>
          <button
            onClick={() => window.print()}
            className="mt-4 ml-2 bg-green-600 text-white px-4 py-2 rounded"
          >
            Cetak
          </button>
        </div>
      )}
    </div>
  );
};

export default StrukPenjualan;
