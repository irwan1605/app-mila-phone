// src/components/master-management/MasterCrudCard.jsx
import React, { useEffect, useState } from "react";
import FirebaseService from "../../services/FirebaseService";

const formatRupiah = (num) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(Number(num || 0));

export default function MasterCrudCard({
  title,
  subtitle,
  collectionKey,
  fields,
  excelFileName,
  listenFnName,
  addFnName,
  updateFnName,
  deleteFnName,
  mode, // ✅ MODE KHUSUS
}) {
  const [data, setData] = useState([]);
  const [form, setForm] = useState({});

  // =========================
  // REALTIME LISTEN
  // =========================
  useEffect(() => {
    const fn = FirebaseService[listenFnName];
    if (!fn) return;

    const unsub = fn((rows) => {
      setData(rows || []);
    });

    return () => unsub && unsub();
  }, [listenFnName]);

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async () => {
    const fn = FirebaseService[addFnName];
    if (!fn) return;

    await fn(form);
    setForm({});
  };

  // =========================
  // RENDER TABLE KHUSUS
  // =========================
  const renderSpecialTable = () => {
    const flatRows = [];

    data.forEach((item) => {
      flatRows.push({
        ...item,
        jenisHarga: "SRP",
        nominal: item.hargaSRP,
        hargaUnit: formatRupiah(item.hargaSRP),
      });

      flatRows.push({
        ...item,
        jenisHarga: "RESELLER",
        nominal: item.hargaReseller,
        hargaUnit: formatRupiah(item.hargaReseller),
      });

      flatRows.push({
        ...item,
        jenisHarga: "GROSIR",
        nominal: item.hargaGrosir,
        hargaUnit: formatRupiah(item.hargaGrosir),
      });
    });

    return (
      <table className="w-full text-sm border mt-6">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2">Nama Master Brand</th>
            <th className="p-2">Nama Kategori Brand</th>
            <th className="p-2">Tipe Nama Barang</th>
            <th className="p-2">Kategori Harga</th>
            <th className="p-2">Jenis Harga</th>
            <th className="p-2">Nominal</th>
            <th className="p-2">Harga Unit (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {flatRows.map((x, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">{x.namaMasterBrand}</td>
              <td className="p-2">{x.namaKategoriBrand}</td>
              <td className="p-2">{x.tipeNamaBarang}</td>
              <td className="p-2">{x.kategoriHarga}</td>
              <td className="p-2 font-bold">{x.jenisHarga}</td>
              <td className="p-2">{x.nominal}</td>
              <td className="p-2 font-bold text-green-600">{x.hargaUnit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="bg-white shadow rounded-xl p-6">
      <h2 className="font-bold text-lg">{title}</h2>
      <p className="text-sm text-gray-500 mb-4">{subtitle}</p>

      {/* FORM INPUT */}
      <div className="grid md:grid-cols-3 gap-3">
        {fields.map((f) => (
          <input
            key={f.name}
            placeholder={f.label}
            type={f.type || "text"}
            value={form[f.name] || ""}
            onChange={(e) =>
              setForm({ ...form, [f.name]: e.target.value })
            }
            className="border p-2 rounded"
          />
        ))}
      </div>

      <button
        onClick={handleSubmit}
        className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded"
      >
        Simpan
      </button>

      {/* ========================= */}
      {/* TABLE NORMAL / KHUSUS */}
      {/* ========================= */}
      {mode === "HARGA_3_BARIS" ? renderSpecialTable() : null}
    </div>
  );
}
