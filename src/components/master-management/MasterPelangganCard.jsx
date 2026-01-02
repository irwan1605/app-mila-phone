import React, { useState } from "react";
import MasterCrudCard from "./MasterCrudCard";
import { exportToExcel } from "../../utils/exportToExcel";

export default function MasterPelangganCard() {
  const [pelangganList, setPelangganList] = useState([]);

  const fields = [
    { name: "idPelanggan", label: "ID Pelanggan", disabledOnCreate: true },
    { name: "namaPelanggan", label: "Nama Pelanggan", required: true },
    { name: "nik", label: "NIK" },
    { name: "noTelpon", label: "No. Telpon" },
    { name: "alamat", label: "Alamat", type: "textarea" },
  ];

  const handleExport = () => {
    if (pelangganList.length === 0) {
      alert("❌ Data kosong, tidak bisa export");
      return;
    }

    const formattedData = pelangganList.map((row) => {
      const obj = {};
      fields.forEach((f) => {
        obj[f.label] = row[f.name] ?? "";
      });
      return obj;
    });

    exportToExcel({
      data: formattedData,
      fileName: "MASTER_PELANGGAN",
      sheetName: "Pelanggan",
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Master Pelanggan</h2>

        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700
                   text-white text-sm font-semibold shadow"
        >
          Export Excel
        </button>
      </div>

      <MasterCrudCard
        title="MASTER PELANGGAN"
        subtitle="Data pelanggan (ID otomatis)"
        collectionKey="masterPelanggan"
        fields={fields}
        listenFnName="listenMasterPelanggan"
        addFnName="addMasterPelanggan"
        updateFnName="updateMasterPelanggan"
        deleteFnName="deleteMasterPelanggan"
        onDataChange={setPelangganList}
      />
    </div>
  );
}
