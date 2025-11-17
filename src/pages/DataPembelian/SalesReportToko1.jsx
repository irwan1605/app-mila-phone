import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, ArcElement, Tooltip, Legend } from 'chart.js';

const SalesReportToko1 = () => {
    const navigate = useNavigate();

  const cards = [
    {
      title: 'Penjualan Handphone : Rp 15.000.000',
      color: 'bg-blue-500',
      description: '-- Lihat Laporan Penjualan Handphone --',
      route: '/sales-report/toko1/handphone',
    },
    {
      title: 'Penjualan Motor Listrik : Rp 20.000.000',
      color: 'bg-green-500',
      description: '-- Lihat Laporan Penjualan Motor Listrik --',
      route: '/sales-report/toko1/motor-listrik',
    },
    {
      title: 'Penjualan Accessories : Rp 4.000.000',
      color: 'bg-yellow-500',
      description: '-- Lihat Laporan Penjualan Accessories --',
      route: '/sales-report/toko1/accessories',
    },
    {
      title: 'Service Handphone Toko1 : Rp 6.000.000',
      color: 'bg-red-500',
      description: '-- Lihat Laporan Servis Handphone --',
      route: '/sales-report/toko1/servis-handphone',
    },
  ];

  const barData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'juli', 'Agtus', 'Okt', 'Sept', 'Nov', 'Des'],
    datasets: [
      {
        label: 'Penjualan Produk',
        data: [50, 75, 60, 90, 120, 85, 65, 85, 60, 80, 95, 105],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const pieData = {
    labels: ['Phone X', 'E-Bike Y', 'Phone Z'],
    datasets: [
      {
        data: [45, 25, 30],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        hoverBackgroundColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
        ],
      },
    ],
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard Laporan Penjualan Toko 1</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
      <div className="flex space-x-8 mr-1  mb-4">
        <Link to="/toko1/tambah-penjualan" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          Tambah Data Penjualan
        </Link>
        <Link to="/toko1/edit-penjualan" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Edit Data Penjualan
        </Link>
        <Link to="/toko1/hapus-penjualan" className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          Hapus Data Penjualan
        </Link>
      </div>
      
      {/* Table for displaying sales data */}
      {/* <PenjualanTable /> */}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`p-6 rounded-lg shadow-lg ${card.color} text-white cursor-pointer`}
            onClick={() => navigate(card.route)}
          >
            <h2 className="text-2xl text-center font-bold mb-4">{card.title}</h2>
            <p>{card.description}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. Bar Chart */}
        <div className="bg-white p-4 rounded shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Penjualan Produk (Bar Chart)</h2>
          <Bar data={barData}  />
        </div>
        
         {/* 3. Pie Chart */}
         <div className="bg-white p-4 rounded shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Distribusi Produk Terjual (Pie Chart)</h2>
          <Pie data={pieData}  />
        </div> 
      </div>
    </div>
  );
};

//   const handphoneSales = [
//     { customer: 'John Doe', sales: 'Alice', imei: '123456789', phone: '081234567890', price: 3000000, type: 'Samsung', warranty: '1 year' },
//     { customer: 'Jane Smith', sales: 'Bob', imei: '987654321', phone: '081234567891', price: 4000000, type: 'iPhone', warranty: '2 years' },
//     // Tambahkan 3 data dummy lainnya
//   ];

//   const motorSales = [
//     { customer: 'Michael Brown', sales: 'Charlie', machineNo: '12345', batteryNo: '98765', phone: '081234567892', price: 15000000, type: 'Vespa Electric', warranty: '2 years' },
//     // Tambahkan 4 data dummy lainnya
//   ];

//   const accessoriesSales = [
//     { customer: 'Alice Johnson', sales: 'David', phone: '081234567893', price: 200000, phoneType: 'Samsung', motorType: 'Vespa Electric' },
//     // Tambahkan 4 data dummy lainnya
//   ];

//   const serviceHp = [
//     { customer: 'Bob Williams', serviceType: 'Screen Repair', phone: '081234567894', price: 500000, status: 'Completed' },
//     // Tambahkan 4 data dummy lainnya
//   ];

//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-3xl font-bold mb-6">Laporan Penjualan - Toko 1</h1>

//       {/* Penjualan Handphone */}
//       <h2 className="text-2xl font-semibold mb-4">Penjualan Handphone</h2>
//       <table className="table-auto w-full mb-8">
//         <thead>
//           <tr>
//             <th>Customer</th>
//             <th>Sales</th>
//             <th>IMEI</th>
//             <th>Phone</th>
//             <th>Price</th>
//             <th>Type</th>
//             <th>Warranty</th>
//           </tr>
//         </thead>
//         <tbody>
//           {handphoneSales.map((sale, index) => (
//             <tr key={index}>
//               <td>{sale.customer}</td>
//               <td>{sale.sales}</td>
//               <td>{sale.imei}</td>
//               <td>{sale.phone}</td>
//               <td>{sale.price}</td>
//               <td>{sale.type}</td>
//               <td>{sale.warranty}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* Penjualan Motor Listrik */}
//       <h2 className="text-2xl font-semibold mb-4">Penjualan Motor Listrik</h2>
//       <table className="table-auto w-full mb-8">
//         <thead>
//           <tr>
//             <th>Customer</th>
//             <th>Sales</th>
//             <th>Machine No</th>
//             <th>Battery No</th>
//             <th>Phone</th>
//             <th>Price</th>
//             <th>Type</th>
//             <th>Warranty</th>
//           </tr>
//         </thead>
//         <tbody>
//           {motorSales.map((sale, index) => (
//             <tr key={index}>
//               <td>{sale.customer}</td>
//               <td>{sale.sales}</td>
//               <td>{sale.machineNo}</td>
//               <td>{sale.batteryNo}</td>
//               <td>{sale.phone}</td>
//               <td>{sale.price}</td>
//               <td>{sale.type}</td>
//               <td>{sale.warranty}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* Penjualan Accessories */}
//       <h2 className="text-2xl font-semibold mb-4">Penjualan Accessories</h2>
//       <table className="table-auto w-full mb-8">
//         <thead>
//           <tr>
//             <th>Customer</th>
//             <th>Sales</th>
//             <th>Phone</th>
//             <th>Price</th>
//             <th>Phone Type</th>
//             <th>Motor Type</th>
//           </tr>
//         </thead>
//         <tbody>
//           {accessoriesSales.map((sale, index) => (
//             <tr key={index}>
//               <td>{sale.customer}</td>
//               <td>{sale.sales}</td>
//               <td>{sale.phone}</td>
//               <td>{sale.price}</td>
//               <td>{sale.phoneType}</td>
//               <td>{sale.motorType}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* Servis Handphone */}
//       <h2 className="text-2xl font-semibold mb-4">Servis Handphone</h2>
//       <table className="table-auto w-full mb-8">
//         <thead>
//           <tr>
//             <th>Customer</th>
//             <th>Service Type</th>
//             <th>Phone</th>
//             <th>Price</th>
//             <th>Status</th>
//           </tr>
//         </thead>
//         <tbody>
//           {serviceHp.map((service, index) => (
//             <tr key={index}>
//               <td>{service.customer}</td>
//               <td>{service.serviceType}</td>
//               <td>{service.phone}</td>
//               <td>{service.price}</td>
//               <td>{service.status}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

export default SalesReportToko1;
