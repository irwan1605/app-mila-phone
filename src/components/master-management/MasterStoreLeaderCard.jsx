// src/components/master-management/MasterStoreLeaderCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";

export default function MasterStoreLeaderCard() {
  const fields = [
    { name: "namaSL", label: "Nama SL" },
    { name: "nik", label: "No. NIK" },
    { name: "noTelpon", label: "No. Telpon" },
    { name: "alamat", label: "Alamat", type: "textarea" },
  ];

  return (
    <MasterCrudCard
      title="MASTER STORE LEADER (SL)"
      subtitle="Data Store Leader (SL) per toko."
      collectionKey="masterStoreLeader"
      fields={fields}
      excelFileName="Master_StoreLeader"
      listenFnName="listenMasterStoreLeader"
      addFnName="addMasterStoreLeader"
      updateFnName="updateMasterStoreLeader"
      deleteFnName="deleteMasterStoreLeader"
    />
  );
}
