import React from 'react';

const InventoryReport = () => {
  // Dummy data untuk laporan persediaan
  const inventory = [
    { product: 'iPhone 13', category: 'Handphone', stock: 15, status: 'Aman' },
    { product: 'Samsung Galaxy S21', category: 'Handphone', stock: 5, status: 'Hampir Habis' },
    { product: 'Sepeda Listrik X', category: 'Sepeda Listrik', stock: 0, status: 'Habis' },
    { product: 'Sepeda Listrik Y', category: 'Sepeda Listrik', stock: 12, status: 'Aman' },
  ];

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-4">Laporan Persediaan</h1>

       {/* Tombol download*/}
       <div className="mb-4 flex items-center">
        <button
          // onClick={handleDownloadExcel}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-4"
        >
          Download Excel
        </button>
       
        <input
          type="text"
          placeholder="Search reports..."
          // value={searchTerm}
          // onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded px-4 py-2"
        />
      </div>

      <table className="min-w-full bg-white border">
        <thead className="bg-gray-200">
          <tr>
            <th className="py-2 px-4 border text-left">Produk</th>
            <th className="py-2 px-4 border text-left">Kategori</th>
            <th className="py-2 px-4 border text-left">Stok</th>
            <th className="py-2 px-4 border text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map((item, index) => (
            <tr key={index}>
              <td className="border-t py-2 px-4 text-left">{item.product}</td>
              <td className="border-t py-2 px-4 text-left">{item.category}</td>
              <td className="border-t py-2 px-4 text-left">{item.stock}</td>
              <td className={`border-t py-2 px-4 text-left ${item.status === 'Habis' ? 'text-red-600' : item.status === 'Hampir Habis' ? 'text-yellow-600' : 'text-green-600'}`}>
                {item.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryReport;
