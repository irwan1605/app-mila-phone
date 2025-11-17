import React from 'react';

const SalesReport = () => {
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-4">Laporan Penjualan</h1>

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

      <table className="min-w-full bg-white">
        <thead className="bg-gray-200">
          <tr>
            <th className="py-2 px-4 text-left">Tanggal</th>
            <th className="py-2 px-4 text-left">Produk</th>
            <th className="py-2 px-4 text-center">Jumlah</th>
            <th className="py-2 px-4 text-left">Total Harga</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-t py-2 px-4 text-left">2024-09-01</td>
            <td className="border-t py-2 px-4 text-left">iPhone 13</td>
            <td className="border-t py-2 px-4 text-center">2</td>
            <td className="border-t py-2 px-4 text-left">Rp30,000,000</td>
          </tr>
          <tr>
            <td className="border-t py-2 px-4 text-left">2024-09-02</td>
            <td className="border-t py-2 px-4 text-left">Infinix Smart 8</td>
            <td className="border-t py-2 px-4 text-center">4</td>
            <td className="border-t py-2 px-4 text-left">Rp12,000,000</td>
          </tr>
          <tr>
            <td className="border-t py-2 px-4 text-left">2024-09-03</td>
            <td className="border-t py-2 px-4 text-left">Xiaomi Redmi 13C</td>
            <td className="border-t py-2 px-4 text-center">3</td>
            <td className="border-t py-2 px-4 text-left">Rp8,000,000</td>
          </tr>
          <tr>
            <td className="border-t py-2 px-4 text-left">2024-09-04</td>
            <td className="border-t py-2 px-4 text-left">Samsung Galaxy A05s</td>
            <td className="border-t py-2 px-4 text-center">2</td>
            <td className="border-t py-2 px-4 text-left">Rp7,500,000</td>
          </tr>
          <tr>
            <td className="border-t py-2 px-4 text-left">2024-09-05</td>
            <td className="border-t py-2 px-4 text-left">Vivo iQOO Z9 5G</td>
            <td className="border-t py-2 px-4 text-center">3</td>
            <td className="border-t py-2 px-4 text-left">Rp13,000,000</td>
          </tr>
          <tr>
            <td className="border-t py-2 px-4 text-left">2024-09-06</td>
            <td className="border-t py-2 px-4 text-left">Xiaomi Poco X6 5G</td>
            <td className="border-t py-2 px-4 text-center">5</td>
            <td className="border-t py-2 px-4 text-left">Rp19,000,000</td>
          </tr>
          <tr>
            <td className="border-t py-2 px-4 text-left">2024-09-07</td>
            <td className="border-t py-2 px-4 text-left">Viar New Q1</td>
            <td className="border-t py-2 px-4 text-center">2</td>
            <td className="border-t py-2 px-4 text-left">Rp36,000,000</td>
          </tr>
          <tr>
            <td className="border-t py-2 px-4 text-left">2024-09-08</td>
            <td className="border-t py-2 px-4 text-left">Uwinfly Love Summer</td>
            <td className="border-t py-2 px-4 text-center">1</td>
            <td className="border-t py-2 px-4 text-left">Rp8,000,000</td>
          </tr>
          <tr>
            <td className="border-t py-2 px-4 text-left">2024-09-09</td>
            <td className="border-t py-2 px-4 text-left">NIU Gova 03</td>
            <td className="border-t py-2 px-4 text-center">2</td>
            <td className="border-t py-2 px-4 text-left">Rp42,000,000</td>
          </tr>
          <tr>
            <td className="border-t py-2 px-4 text-left">2024-09-10</td>
            <td className="border-t py-2 px-4 text-left">ECGO 5</td>
            <td className="border-t py-2 px-4 text-center">1</td>
            <td className="border-t py-2 px-4 text-left">Rp16,000,000</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SalesReport;
