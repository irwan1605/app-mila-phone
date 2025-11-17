import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const Products = () => {
  // Dummy data produk
  const [products, setProducts] = useState([
    { id: 1, name: 'iPhone 13', category: 'Handphone', price: 15000000, stock: 15 },
    { id: 2, name: 'Samsung Galaxy S21', category: 'Handphone', price: 12000000, stock: 5 },
    { id: 3, name: 'Sepeda Listrik X', category: 'Sepeda Listrik', price: 8000000, stock: 0 },
    { id: 4, name: 'Sepeda Listrik Y', category: 'Sepeda Listrik', price: 10000000, stock: 12 },
  ]);

  const [searchTerm, setSearchTerm] = useState(''); // State untuk input pencarian

  // Fungsi untuk filter produk berdasarkan pencarian
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(products); // Mengonversi data menjadi sheet Excel
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    
    // Menyimpan file Excel
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'Products.xlsx');
  };

  const handleUploadExcel = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setProducts(jsonData); // Set data dari Excel ke state
    };
    
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-4">Daftar Produk MILA PHONE</h1>

      {/* Tombol untuk download dan upload */}
      <div className="mb-4">
        <button
          onClick={handleDownloadExcel}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-4"
        >
          Download Excel
        </button>
         {/* Input pencarian */}
         <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded px-4 py-2"
        />
      </div>

      <table className="min-w-full bg-white border">
        <thead className="bg-gray-200">
          <tr>
            <th className="py-2 px-4 border text-left">Nama Produk</th>
            <th className="py-2 px-4 border text-left">Kategori</th>
            <th className="py-2 px-4 border text-left">Harga</th>
            <th className="py-2 px-4 border text-center">Stok</th>
            <th className="py-2 px-4 border text-left">Aksi</th>
          </tr>
        </thead>
        <tbody>
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <tr key={product.id}>
              <td className="border-t py-2 px-4 text-left">{product.name}</td>
              <td className="border-t py-2 px-4 text-left">{product.category}</td>
              <td className="border-t py-2 px-4 text-left">{product.price.toLocaleString()}</td>
              <td className="border-t py-2 px-4 text-center">{product.stock}</td>
              <td className="border-t py-2 px-4 text-left">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                  Detail
                </button>
              </td>
            </tr>
          ))
          ) : (
            <tr>
              <td colSpan="4" className="py-2 px-4 border-b text-center">No products found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Products;
