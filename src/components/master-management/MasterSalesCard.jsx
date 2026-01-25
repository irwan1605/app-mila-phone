import React, { useEffect, useState } from "react";
import MasterCrudCard from "./MasterCrudCard";
import { exportToExcel } from "../../utils/exportToExcel";
import { listenMasterToko } from "../../services/FirebaseService";

export default function MasterSalesCard() {
  const [rows, setRows] = useState([]);
  const [masterToko, setMasterToko] = useState([]);
  const [filterToko, setFilterToko] = useState("");

  useEffect(() => {
    const unsub = listenMasterToko((data) => {
      setMasterToko(Array.isArray(data) ? data : []);
    });
    return () => unsub && unsub();
  }, []);

  const fields = [
    { name: "namaSales", label: "Nama Sales", required: true },
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

  // FILTER BERDASARKAN TOKO
  const filteredRows = filterToko
    ? rows.filter((r) => r.namaToko === filterToko)
    : rows;

  const handleExport = () => {
    if (!filteredRows || filteredRows.length === 0) {
      alert("❌ Data kosong, tidak bisa export");
      return;
    }

    const formattedData = filteredRows.map((row) => {
      const obj = {};
      fields.forEach((f) => {
        obj[f.label] = row[f.name] ?? "";
      });
      return obj;
    });

    exportToExcel({
      data: formattedData,
      fileName: "MASTER_SALES",
      sheetName: "Sales",
    });
  };

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold">MASTER SALES</h2>
          <p className="text-sm text-slate-500">Data sales per toko</p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow"
        >
          Export Excel
        </button>
      </div>

      {/* FILTER TOKO */}
      <div className="mb-3 flex gap-3 items-center">
        <label className="text-sm">Filter Toko:</label>
        <select
          value={filterToko}
          onChange={(e) => setFilterToko(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Semua Toko</option>
          {masterToko.map((t) => (
            <option key={t.id} value={t.nama}>
              {t.nama}
            </option>
          ))}
        </select>
      </div>

      <MasterCrudCard
        title="MASTER SALES"
        subtitle="Data sales penjualan"
        collectionKey="masterSales"
        fields={fields}
        listenFnName="listenMasterSales"
        addFnName="addMasterSales"
        updateFnName="updateMasterSales"
        deleteFnName="deleteMasterSales"
        onDataChange={setRows}
        externalRows={filteredRows}   // ⬅️ kirim data hasil filter
      />
    </div>
  );
}
