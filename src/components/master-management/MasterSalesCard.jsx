// src/components/master-management/MasterSalesCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";

export default function MasterSalesCard() {
  const fields = [
    { name: "namaSales", label: "Nama Sales" },
    { name: "nik", label: "No. NIK" },
    { name: "noTelpon", label: "No. Telpon" },
    { name: "alamat", label: "Alamat", type: "textarea" },
  ];

  return (
    <MasterCrudCard
      title="MASTER SALES"
      subtitle="Data sales yang terkait dengan transaksi penjualan."
      collectionKey="masterSales"
      fields={fields}
      excelFileName="Master_Sales"
      listenFnName="listenMasterSales"
      addFnName="addMasterSales"
      updateFnName="updateMasterSales"
      deleteFnName="deleteMasterSales"
    />
  );
}
