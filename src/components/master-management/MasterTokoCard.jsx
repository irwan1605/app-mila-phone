// src/components/master-management/MasterTokoCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";

export default function MasterTokoCard() {
  const fields = [
    {
      name: "namaToko",
      label: "Nama Toko",
      required: true,
      disabledOnCreate: true,
    },
    {
      name: "alamat",
      label: "Alamat",
      type: "textarea",
    },
  ];

  return (
    <MasterCrudCard
      title="MASTER TOKO"
      subtitle="Edit data toko yang sudah terdaftar"
      collectionKey="masterToko"
      fields={fields}
      excelFileName="Master_Toko"

      listenFnName="listenMasterToko"
      updateFnName="updateMasterToko"

      addFnName={null}       // ❌ tidak bisa tambah
      deleteFnName={null}    // ❌ tidak bisa hapus

      submitLabel="Edit Data"
      disableCreate={true}
    />
  );
}
