// src/components/master-management/MasterPelangganCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";

export default function MasterPelangganCard() {
  const fields = [
    { name: "idPelanggan", label: "ID Pelanggan" },
    { name: "namaPelanggan", label: "Nama Akun / Pelanggan" },
    { name: "nik", label: "No. NIK" },
    { name: "noTelpon", label: "No. Telpon" },
    { name: "alamat", label: "Alamat", type: "textarea" },
  ];

  return (
    <MasterCrudCard
      title="MASTER PELANGGAN"
      subtitle="Data akun / pelanggan yang digunakan di seluruh transaksi."
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
