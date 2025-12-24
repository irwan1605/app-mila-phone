import React, { useEffect, useState } from "react";
import MasterCrudCard from "./MasterCrudCard";
import { listenMasterToko } from "../../services/FirebaseService";

export default function MasterTokoCard() {
  const [rows, setRows] = useState([]);

  // 🔥 NORMALISASI DATA MASTER TOKO
  useEffect(() => {
    const unsub = listenMasterToko((data) => {
      const normalized = (Array.isArray(data) ? data : []).map((t) => ({
        ...t,
        // ⬇️ PASTIKAN FIELD INI ADA UNTUK TABLE
        namaToko: t.namaToko || "",
      }));
      setRows(normalized);
    });

    return () => unsub && unsub();
  }, []);

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
      listenData={rows}              
      updateFnName="updateMasterToko"
      deleteFnName="deleteMasterToko"
      addFnName={null}
      disableCreate={true}
      submitLabel="Simpan Perubahan"
    />
  );
}
