import React, {
    useState,
  } from "react";
  
  import { FaFileExcel } from "react-icons/fa";
  
  import { processImportMasterSales } from "./processImportMasterSales";
  
  export default function ImportMasterSalesExcel({
    rows = [],
  
    masterToko = [],
  }) {
    const [loading, setLoading] =
      useState(false);
  
    const handleImport =
      async (e) => {
        const file =
          e.target.files?.[0];
  
        if (!file) return;
  
        setLoading(true);
  
        try {
          const result =
            await processImportMasterSales(
              {
                file,
  
                existingSales:
                  rows,
  
                masterToko,
              }
            );
  
          alert(
            result?.message ||
              "Selesai"
          );
        } catch (err) {
          console.error(err);
  
          alert(
            "❌ Gagal import excel"
          );
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
  
        {loading
          ? "IMPORTING..."
          : "Import Excel"}
  
        <input
          type="file"
          hidden
          accept=".xlsx,.xls"
          onChange={
            handleImport
          }
        />
      </label>
    );
  }