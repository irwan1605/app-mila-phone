// src/components/master-management/MasterTokoCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";

/**
 * MASTER TOKO
 * MODE: EDIT ONLY
 * - Tidak bisa tambah toko baru
 * - Hanya edit data toko existing
 * - Aman dari TOKO 1 / toko liar
 */
export default function MasterTokoCard() {
  const fields = [
    {
      name: "namaToko",
      label: "Nama Toko",
      required: true,
      disabledOnCreate: true, // ⬅️ proteksi ekstra
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
      subtitle="Edit data toko yang sudah terdaftar (tidak bisa menambah toko baru)."
      collectionKey="masterToko"
      fields={fields}
      excelFileName="Master_Toko"

      // ===============================
      // LISTENER & UPDATE ONLY
      // ===============================
      listenFnName="listenMasterToko"
      updateFnName="updateMasterToko"

      // ===============================
      // ❌ DISABLE CREATE & DELETE
      // ===============================
      addFnName={null}        // ⬅️ MATIKAN TAMBAH DATA
      deleteFnName={null}     // ⬅️ (OPSIONAL) matikan hapus toko

      // ===============================
      // CUSTOM LABEL (kalau didukung MasterCrudCard)
      // ===============================
      submitLabel="Edit Data"
      disableCreate={true}   // ⬅️ jika MasterCrudCard support
    />
  );
}
