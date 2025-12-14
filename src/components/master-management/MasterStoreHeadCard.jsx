// src/components/master-management/MasterStoreHeadCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";

export default function MasterStoreHeadCard() {
  const fields = [
    { name: "namaSH", label: "Nama Store Head", required: true },
    { name: "nik", label: "NIK" },
    { name: "noTelpon", label: "No. Telpon" },
    { name: "alamat", label: "Alamat", type: "textarea" },
  ];

  return (
    <MasterCrudCard
      title="MASTER STORE HEAD (SH)"
      subtitle="Data Store Head toko"
      collectionKey="masterStoreHead"
      fields={fields}
      excelFileName="Master_StoreHead"

      listenFnName="listenMasterStoreHead"
      addFnName="addMasterStoreHead"
      updateFnName="updateMasterStoreHead"
      deleteFnName="deleteMasterStoreHead"
    />
  );
}
