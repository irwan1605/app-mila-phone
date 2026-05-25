import React, { useState } from "react";

import { FaFileExcel } from "react-icons/fa";

import { processImportPembelian } from "./processImportPembelian";

export default function ImportPembelianExcel({
  masterBarang = [],
  masterToko = [],
}) {
  const [loading, setLoading] = useState(false);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setLoading(true);

    try {
      const result = await processImportPembelian({
        file,
        masterBarang,
        masterToko,
      });

      if (result.success) {
        alert("✅ IMPORT PEMBELIAN BERHASIL");
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
        rounded-xl
        bg-emerald-600
        hover:bg-emerald-700
        text-white
        flex items-center gap-2
        cursor-pointer
        shadow-md
      "
    >
      <FaFileExcel />

      {loading ? "IMPORTING..." : "Import Excel"}

      <input type="file" accept=".xlsx,.xls" hidden onChange={handleImport} />
    </label>
  );
}
