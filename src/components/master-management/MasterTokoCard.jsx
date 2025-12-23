import React from "react";
import MasterCrudCard from "./MasterCrudCard";

export default function MasterTokoCard() {
  const fields = [
    {
      name: "namaToko",
      label: "Nama Toko",
      required: true,
      disabledOnCreate: true,
      disabledOnEdit: true, // 🔒 nama toko tidak boleh diubah
    },
    {
      name: "alamat",
      label: "Alamat",
      type: "textarea",
      required: true,
    },
  ];

  return (
    <MasterCrudCard
      title="MASTER TOKO"
      subtitle="Edit & Hapus data toko (Tambah dinonaktifkan)"
      collectionKey="masterToko"
      fields={fields}
      excelFileName="Master_Toko"

      listenFnName="listenMasterToko"
      updateFnName="updateMasterToko"
      deleteFnName="deleteMasterToko"

      addFnName={null}        // ❌ tidak bisa tambah
      disableCreate={true}   // ❌ form tambah dimatikan

      submitLabel="Simpan Perubahan"
    />
  );
}
