// src/components/master-management/MasterSalesTitipanCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";

export default function MasterSalesTitipanCard() {
  const fields = [
    { name: "namaTitipan", label: "Nama Titipan (ST)" },
    { name: "nik", label: "No. NIK" },
    { name: "noTelpon", label: "No. Telpon" },
    { name: "alamat", label: "Alamat", type: "textarea" },
  ];

  return (
    <MasterCrudCard
      title="MASTER SALES TITIPAN (ST)"
      subtitle="Data sales titipan (ST) yang terkait transaksi."
      collectionKey="masterSalesTitipan"
      fields={fields}
      excelFileName="Master_SalesTitipan"
      listenFnName="listenMasterSalesTitipan"
      addFnName="addMasterSalesTitipan"
      updateFnName="updateMasterSalesTitipan"
      deleteFnName="deleteMasterSalesTitipan"
    />
  );
}
