// src/components/master-management/MasterStoreLeaderCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";
import { exportToExcel } from "../../utils/exportToExcel";

export default function MasterStoreLeaderCard() {
  const fields = [
    { name: "namaSL", label: "Nama Store Leader", required: true },
    { name: "nik", label: "NIK" },
    { name: "noTelpon", label: "No. Telpon" },
    { name: "alamat", label: "Alamat", type: "textarea" },
  ];

  return (
    <MasterCrudCard
      title="MASTER STORE LEADER (SL)"
      subtitle="Data Store Leader per toko"
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
