// src/components/master-management/MasterStoreHeadCard.jsx
import React, { useEffect, useState } from "react";
import MasterCrudCard from "./MasterCrudCard";
import { listenMasterToko } from "../../services/FirebaseService";

export default function MasterStoreHeadCard() {
  const [masterToko, setMasterToko] = useState([]);

  useEffect(() => {
    const unsub = listenMasterToko((data) => {
      setMasterToko(data || []);
    });
    return () => unsub && unsub();
  }, []);

  const fields = [
    { name: "namaSH", label: "Nama Store Head", required: true },

    {
      name: "namaToko",
      label: "Nama Toko",
      type: "select",
      options: masterToko.map((t) => ({
        value: t.nama,
        label: t.nama,
      })),
      required: true,
    },

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
