import React from 'react';

const SalesReportToko2 = () => {
  const handphoneSales = [
    { customer: 'John Doe', sales: 'Alice', imei: '123456789', phone: '081234567890', price: 3000000, type: 'Samsung', warranty: '1 year' },
    { customer: 'Jane Smith', sales: 'Bob', imei: '987654321', phone: '081234567891', price: 4000000, type: 'iPhone', warranty: '2 years' },
    // Tambahkan 3 data dummy lainnya
  ];

  const motorSales = [
    { customer: 'Michael Brown', sales: 'Charlie', machineNo: '12345', batteryNo: '98765', phone: '081234567892', price: 15000000, type: 'Vespa Electric', warranty: '2 years' },
    // Tambahkan 4 data dummy lainnya
  ];

  const accessoriesSales = [
    { customer: 'Alice Johnson', sales: 'David', phone: '081234567893', price: 200000, phoneType: 'Samsung', motorType: 'Vespa Electric' },
    // Tambahkan 4 data dummy lainnya
  ];

  const serviceHp = [
    { customer: 'Bob Williams', serviceType: 'Screen Repair', phone: '081234567894', price: 500000, status: 'Completed' },
    // Tambahkan 4 data dummy lainnya
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Laporan Penjualan - Toko 1</h1>

      {/* Penjualan Handphone */}
      <h2 className="text-2xl font-semibold mb-4">Penjualan Handphone</h2>
      <table className="table-auto w-full mb-8">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Sales</th>
            <th>IMEI</th>
            <th>Phone</th>
            <th>Price</th>
            <th>Type</th>
            <th>Warranty</th>
          </tr>
        </thead>
        <tbody>
          {handphoneSales.map((sale, index) => (
            <tr key={index}>
              <td>{sale.customer}</td>
              <td>{sale.sales}</td>
              <td>{sale.imei}</td>
              <td>{sale.phone}</td>
              <td>{sale.price}</td>
              <td>{sale.type}</td>
              <td>{sale.warranty}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Penjualan Motor Listrik */}
      <h2 className="text-2xl font-semibold mb-4">Penjualan Motor Listrik</h2>
      <table className="table-auto w-full mb-8">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Sales</th>
            <th>Machine No</th>
            <th>Battery No</th>
            <th>Phone</th>
            <th>Price</th>
            <th>Type</th>
            <th>Warranty</th>
          </tr>
        </thead>
        <tbody>
          {motorSales.map((sale, index) => (
            <tr key={index}>
              <td>{sale.customer}</td>
              <td>{sale.sales}</td>
              <td>{sale.machineNo}</td>
              <td>{sale.batteryNo}</td>
              <td>{sale.phone}</td>
              <td>{sale.price}</td>
              <td>{sale.type}</td>
              <td>{sale.warranty}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Penjualan Accessories */}
      <h2 className="text-2xl font-semibold mb-4">Penjualan Accessories</h2>
      <table className="table-auto w-full mb-8">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Sales</th>
            <th>Phone</th>
            <th>Price</th>
            <th>Phone Type</th>
            <th>Motor Type</th>
          </tr>
        </thead>
        <tbody>
          {accessoriesSales.map((sale, index) => (
            <tr key={index}>
              <td>{sale.customer}</td>
              <td>{sale.sales}</td>
              <td>{sale.phone}</td>
              <td>{sale.price}</td>
              <td>{sale.phoneType}</td>
              <td>{sale.motorType}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Servis Handphone */}
      <h2 className="text-2xl font-semibold mb-4">Servis Handphone</h2>
      <table className="table-auto w-full mb-8">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Service Type</th>
            <th>Phone</th>
            <th>Price</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {serviceHp.map((service, index) => (
            <tr key={index}>
              <td>{service.customer}</td>
              <td>{service.serviceType}</td>
              <td>{service.phone}</td>
              <td>{service.price}</td>
              <td>{service.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SalesReportToko2;
