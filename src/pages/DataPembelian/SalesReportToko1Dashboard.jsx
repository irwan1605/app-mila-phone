import React from 'react';
import { useNavigate } from 'react-router-dom';

const SalesReportToko1Dashboard = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Penjualan Handphone',
      color: 'bg-blue-500',
      description: 'Lihat laporan penjualan handphone',
      route: '/sales-report/toko1/handphone',
    },
    {
      title: 'Penjualan Motor Listrik',
      color: 'bg-green-500',
      description: 'Lihat laporan penjualan motor listrik',
      route: '/sales-report/toko1/motor-listrik',
    },
    {
      title: 'Penjualan Accessories',
      color: 'bg-yellow-500',
      description: 'Lihat laporan penjualan accessories',
      route: '/sales-report/toko1/accessories',
    },
    {
      title: 'Servis Handphone',
      color: 'bg-red-500',
      description: 'Lihat laporan servis handphone',
      route: '/sales-report/toko1/servis-handphone',
    },
  ];

    return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard Laporan Penjualan Toko 1</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`p-6 rounded-lg shadow-lg ${card.color} text-white cursor-pointer`}
            onClick={() => navigate(card.route)}
          >
            <h2 className="text-2xl font-bold mb-4">{card.title}</h2>
            <p>{card.description}</p>
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default SalesReportToko1Dashboard;
