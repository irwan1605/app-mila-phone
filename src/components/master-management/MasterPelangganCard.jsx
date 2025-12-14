// src/components/master-management/MasterPelangganCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";

export default function MasterPelangganCard() {
  const fields = [
    {
      name: "idPelanggan",
      label: "ID Pelanggan",
      disabledOnCreate: true, // AUTO dari Firebase
    },
    { name: "namaPelanggan", label: "Nama Pelanggan", required: true },
    { name: "nik", label: "NIK" },
    { name: "noTelpon", label: "No. Telpon" },
    { name: "alamat", label: "Alamat", type: "textarea" },
  ];

  return (
    <MasterCrudCard
      title="MASTER PELANGGAN"
      subtitle="Data pelanggan (ID otomatis)"
      collectionKey="masterPelanggan"
      fields={fields}
      excelFileName="Master_Pelanggan"

      listenFnName="listenMasterPelanggan"
      addFnName="addMasterPelanggan"
      updateFnName="updateMasterPelanggan"
      deleteFnName="deleteMasterPelanggan"
    />
  );
}
