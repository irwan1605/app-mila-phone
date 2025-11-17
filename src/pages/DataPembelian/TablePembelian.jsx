import React from 'react';

const TablePembelian = () => {
  const dataDummy = [
    { id: 1, namaPelanggan: 'John Doe', namaSales: 'Alice', nomorEmei: '123456789', harga: 'Rp. 3.000.000', tipeHandphone: 'Samsung' },
    { id: 2, namaPelanggan: 'Jane Smith', namaSales: 'Bob', nomorEmei: '987654321', harga: 'Rp. 2.500.000', tipeHandphone: 'iPhone' },
    // Data dummy lainnya...
  ];

  return (
    <table className="w-full bg-white shadow-md rounded mt-6">
      <thead>
        <tr className="bg-gray-200 text-left">
          <th className="p-3">Nama Pelanggan</th>
          <th className="p-3">Nama Sales</th>
          <th className="p-3">Nomor Emei</th>
          <th className="p-3">Harga</th>
          <th className="p-3">Tipe Handphone</th>
        </tr>
      </thead>
      <tbody>
        {dataDummy.map((item) => (
          <tr key={item.id} className="border-b">
            <td className="p-3">{item.namaPelanggan}</td>
            <td className="p-3">{item.namaSales}</td>
            <td className="p-3">{item.nomorEmei}</td>
            <td className="p-3">{item.harga}</td>
            <td className="p-3">{item.tipeHandphone}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TablePembelian;
