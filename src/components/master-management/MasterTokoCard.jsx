// src/components/master-management/MasterTokoCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";

export default function MasterTokoCard() {
  const fields = [
    { name: "namaToko", label: "Nama Toko" },
    { name: "alamat", label: "Alamat", type: "textarea" },
  ];

  return (
    <MasterCrudCard
      title="MASTER TOKO"
      subtitle="Data master toko yang digunakan di seluruh sistem."
      collectionKey="masterToko"
      fields={fields}
      excelFileName="Master_Toko"
      listenFnName="listenMasterToko"
      addFnName="addMasterToko"
      updateFnName="updateMasterToko"
      deleteFnName="deleteMasterToko"
    />
  );
}
