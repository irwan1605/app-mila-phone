import React, { useState } from "react";

import { FaFileExcel } from "react-icons/fa";

import { processImportMasterMotor } from "./processImportMasterMotor";

export default function ImportMasterBarangExcel({
  listBarang = [],

  kategori = "",
}) {
  const [loading, setLoading] = useState(false);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setLoading(true);

    try {
      const result = await processImportMasterMotor({
        file,

        kategori,

        existingBarang: listBarang,
      });

      if (result?.success) {
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error(err);

      alert("❌ Gagal import excel");
    }

    setLoading(false);

    e.target.value = "";
  };

  return (
    <label
      className="
          px-4 py-2
          rounded-lg
          bg-blue-600
          hover:bg-blue-700
          text-white
          text-sm
          font-semibold
          shadow
          cursor-pointer
          flex items-center gap-2
        "
    >
      <FaFileExcel />

      {loading ? "IMPORTING..." : `Import Excel ${kategori}`}

      <input type="file" hidden accept=".xlsx,.xls" onChange={handleImport} />
    </label>
  );
}
