import React, { useState } from "react";
import MasterCrudCard from "./MasterCrudCard";
import { exportToExcel } from "../../utils/exportToExcel";

export default function MasterBarangHargaCard() {
  const [rows, setRows] = useState([]);

  const fields = [
    { name: "namaMasterBrand", label: "Nama Brand", required: true },
    { name: "namaKategoriBrand", label: "Kategori Brand" },
    { name: "tipeNamaBarang", label: "Nama Barang" },
    { name: "kategoriHarga", label: "Kategori Harga" },
    { name: "hargaSRP", label: "Harga SRP", type: "number" },
    { name: "hargaGrosir", label: "Harga Grosir", type: "number" },
    { name: "hargaReseller", label: "Harga Reseller", type: "number" },
  ];

  // ===============================
  // EXPORT EXCEL (SESUAI TABLE)
  // ===============================
  const handleExport = () => {
    if (!rows || rows.length === 0) {
      alert("❌ Data kosong, tidak bisa export");
      return;
    }

    const formattedData = rows.map((row) => {
      const obj = {};
      fields.forEach((f) => {
        obj[f.label] = row[f.name] ?? "";
      });
      return obj;
    });

    exportToExcel({
      data: formattedData,
      fileName: "MASTER_BARANG_HARGA",
      sheetName: "Barang & Harga",
    });
  };

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold">MASTER BARANG & HARGA</h2>
          <p className="text-sm text-slate-500">
            Harga SRP, Grosir, dan Reseller
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700
                   text-white text-sm font-semibold shadow"
        >
          Export Excel
        </button>
      </div>

      <MasterCrudCard
        title="MASTER BARANG & HARGA"
        subtitle="Harga SRP, Grosir, dan Reseller"
        collectionKey="masterBarangHarga"
        fields={fields}
        listenFnName="listenMasterBarangHarga"
        addFnName="addMasterBarangHarga"
        updateFnName="updateMasterBarangHarga"
        deleteFnName="deleteMasterBarangHarga"

        /* 🔥 KUNCI: DATA TABLE → EXPORT */
        onDataChange={setRows}
      />
    </div>
  );
}
