import React from "react";
import { useNavigate } from 'react-router-dom';

const SalesReportServisHandphone = () => {
  const navigate = useNavigate();
  const servisHandphoneSales = [
    {
      id: 1,
      tanggal: "02/01/2024",
      namaKaryawan: "John Doe",
      nomorKaryawan: "08176678822",
      namaPic: "Sarah Lee",
      nomorPic: "08123456789",
      hargaModal: "300.000",
      hargaJual: "500.000",
      namaBarang: "LCD",
      nomorMesin: "M123456",
      nomorImei: "081767890123",
      phoneType: "iPhone 13 Pro",
      motorType: "Yamaha E01",
    },
    {
      id: 2,
      tanggal: "02/01/2024",
      namaKaryawan: "Jane Smith",
      nomorKaryawan: "0838456743434",
      namaPic: "Michael Tan",
      nomorPic: "08234567890",
      hargaModal: "1.500.000",
      hargaJual: "2.000.000",
      namaBarang: "Anti Gores",
      nomorMesin: "M234567",
      nomorImei: "083845678012",
      phoneType: "Samsung Galaxy S21",
      motorType: "Gogoro Viva",
    },
    {
      id: 3,
      tanggal: "02/01/2024",
      namaKaryawan: "Robert Brown",
      nomorKaryawan: "081344567891",
      namaPic: "Alice Wong",
      nomorPic: "08345678901",
      hargaModal: "1.300.000",
      hargaJual: "1.500.000",
      namaBarang: "LCD",
      nomorMesin: "M345678",
      nomorImei: "081334567890",
      phoneType: "Xiaomi Mi 11",
      motorType: "NIU NQi GT",
    },
    {
      id: 4,
      tanggal: "02/01/2024",
      namaKaryawan: "Emily Johnson",
      nomorKaryawan: "089876093922",
      namaPic: "David Lim",
      nomorPic: "08456789012",
      hargaModal: "23.000.000",
      hargaJual: "25.000.000",
      namaBarang: "Baterai",
      nomorMesin: "M456789",
      nomorImei: "08987654321",
      phoneType: "iPhone 12",
      motorType: "Vespa Elettrica",
    },
    {
      id: 5,
      tanggal: "02/01/2024",
      namaKaryawan: "Chris Evans",
      nomorKaryawan: "5678904321",
      namaPic: "James Lee",
      nomorPic: "08567890123",
      hargaModal: "8.300.000",
      hargaJual: "9.000.000",
      namaBarang: "Baterai ",
      nomorMesin: "M567890",
      nomorImei: "5678901234",
      phoneType: "Samsung Galaxy S21",
      motorType: "Honda PCX Electric",
    },

    // Tambahkan data dummy lainnya
  ];

  return (
    <div className="container mx-auto p-6">
    <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 bg-green-700 text-white rounded hover:bg-gray-700"
      >
        Kembali
      </button>
      <h1 className="text-3xl font-bold mb-6">
        Laporan Penjualan Servis Handphone - Toko 1
      </h1>
      <table className="table-auto w-full mb-8 bg-white shadow-md rounded-lg">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2 text-left">No</th>
            <th className="py-2 px-4 border-b  text-left">Tanggal Update</th>
              <th className="py-2 px-4 border-b  text-left">Nama PIC</th>
              <th className="py-2 px-4 border-b  text-left">Nomor tlp PIC</th>
              <th className="py-2 px-4 border-b  text-left">Nama Karyawan</th>
              <th className="py-2 px-4 border-b  text-left">Nomor tlp Karyawan</th>
              <th className="py-2 px-4 border-b  text-left">HargaModal</th>
              <th className="py-2 px-4 border-b  text-left">HargaJual</th>
              <th className="py-2 px-4 border-b  text-left">Type Barang</th>
              <th className="py-2 px-4 border-b  text-left">Type Handphone</th>
              <th className="py-2 px-4 border-b  text-left">Nomor Imei HP</th>
              <th className="py-2 px-4 border-b  text-left">Type Motor Listrik</th>
              <th className="py-2 px-4 border-b  text-left">Nomor Mesin</th>
          </tr>
        </thead>
        <tbody>
          {servisHandphoneSales.map((sale, index) => (
            <tr key={index} className="border-b">
              <td className="px-4 py-2">{sale.id}</td>
              <td className="px-4 py-2">{sale.tanggal}</td>
              <td className="px-4 py-2">{sale.namaPic}</td>
              <td className="px-4 py-2">{sale.nomorPic}</td>
              <td className="px-4 py-2">{sale.namaKaryawan}</td>
              <td className="px-4 py-2">{sale.nomorKaryawan}</td>
              <td className="px-4 py-2">{sale.hargaModal}</td>
              <td className="px-4 py-2">{sale.hargaJual}</td>
              <td className="px-4 py-2">{sale.namaBarang}</td>
              <td className="px-4 py-2">{sale.phoneType}</td>
              <td className="px-4 py-2">{sale.nomorImei}</td>
              <td className="px-4 py-2">{sale.motorType}</td>
              <td className="px-4 py-2">{sale.nomorMesin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SalesReportServisHandphone;
