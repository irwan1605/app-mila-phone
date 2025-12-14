// src/components/master-management/MasterSupplierCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";

export default function MasterSupplierCard() {
  const fields = [
    { name: "namaSupplier", label: "Nama Supplier", required: true },
    { name: "noTelpon", label: "No. Telpon" },
    { name: "alamat", label: "Alamat", type: "textarea" },
  ];

  return (
    <MasterCrudCard
      title="MASTER SUPPLIER"
      subtitle="Data master supplier pembelian"
      collectionKey="masterSupplier"
      fields={fields}
      excelFileName="Master_Supplier"

      listenFnName="listenMasterSupplier"
      addFnName="addMasterSupplier"
      updateFnName="updateMasterSupplier"
      deleteFnName="deleteMasterSupplier"
    />
  );
}
