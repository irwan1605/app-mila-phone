// src/components/master-management/MasterCrudCard.jsx
import React, { useEffect, useState } from "react";
import * as FirebaseService from "../../services/FirebaseService";
import { FaPlus, FaEdit, FaTrash, FaFileExcel } from "react-icons/fa";
import * as XLSX from "xlsx";

// fields: [{name, label, type? ("text" | "textarea")}]
// listenFnName, addFnName, updateFnName, deleteFnName: nama function di FirebaseService
export default function MasterCrudCard({
  title,
  subtitle,
  collectionKey,
  fields = [],
  excelFileName = "MasterData",
  listenFnName,
  addFnName,
  updateFnName,
  deleteFnName,
}) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Realtime listener
  useEffect(() => {
    setLoading(true);
    const listenFn = FirebaseService[listenFnName];

    if (typeof listenFn === "function") {
      try {
        const unsub = listenFn((rows = []) => {
          const normalized = (rows || []).map((r) => ({
            ...r,
            id:
              r.id ||
              r._id ||
              r.key ||
              `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          }));
          setItems(normalized);
          setLoading(false);
        });
        return () => {
          try {
            unsub && unsub();
          } catch (e) {
            // ignore
          }
        };
      } catch (err) {
        console.error(`listen error for ${collectionKey}:`, err);
        setLoading(false);
      }
    } else {
      console.warn(
        `FirebaseService.${listenFnName} tidak ditemukan. Tambahkan fungsi ini di FirebaseService agar realtime berjalan.`
      );
      setLoading(false);
    }
  }, [listenFnName, collectionKey]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({});
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {};

    fields.forEach((f) => {
      payload[f.name] = form[f.name] || "";
    });

    // tambahan: timestamp optional
    payload.updatedAt = new Date().toISOString();
    if (!editId) {
      payload.createdAt = new Date().toISOString();
    }

    try {
      if (editId) {
        const updateFn = FirebaseService[updateFnName];
        if (typeof updateFn === "function") {
          await updateFn(editId, payload);
        } else {
          console.warn(
            `FirebaseService.${updateFnName} tidak ditemukan. Update hanya dilakukan di state lokal.`
          );
          setItems((prev) =>
            prev.map((item) => (item.id === editId ? { ...item, ...payload } : item))
          );
        }
      } else {
        const addFn = FirebaseService[addFnName];
        if (typeof addFn === "function") {
          const res = await addFn(payload);
          let newItem = {
            ...payload,
            id:
              (res && (res.id || res.key)) ||
              `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          };
          setItems((prev) => [...prev, newItem]);
        } else {
          console.warn(
            `FirebaseService.${addFnName} tidak ditemukan. Tambahkan ke FirebaseService agar data tersimpan ke database.`
          );
          const newItem = {
            ...payload,
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          };
          setItems((prev) => [...prev, newItem]);
        }
      }

      resetForm();
    } catch (err) {
      console.error(`save error for ${collectionKey}:`, err);
      alert("Gagal menyimpan data. Cek console untuk detail.");
    }
  };

  const handleEdit = (row) => {
    const nextForm = {};
    fields.forEach((f) => {
      nextForm[f.name] = row[f.name] ?? "";
    });
    setForm(nextForm);
    setEditId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (row) => {
    if (!window.confirm("Yakin ingin menghapus data ini?")) return;
    try {
      const deleteFn = FirebaseService[deleteFnName];
      if (typeof deleteFn === "function") {
        await deleteFn(row.id);
      } else {
        console.warn(
          `FirebaseService.${deleteFnName} tidak ditemukan. Hapus hanya di state lokal.`
        );
      }
      setItems((prev) => prev.filter((item) => item.id !== row.id));
    } catch (err) {
      console.error(`delete error for ${collectionKey}:`, err);
      alert("Gagal menghapus data. Cek console untuk detail.");
    }
  };

  const filteredItems = items.filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return fields.some((f) =>
      String(item[f.name] || "")
        .toLowerCase()
        .includes(s)
    );
  });

  const exportExcel = () => {
    try {
      const rows = filteredItems.map((item) => {
        const out = {};
        fields.forEach((f) => {
          out[f.label] = item[f.name] || "";
        });
        return out;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, `${excelFileName}.xlsx`);
    } catch (err) {
      console.error("Export Excel gagal:", err);
      alert("Gagal export Excel.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-800">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari data..."
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-40 md:w-56 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            type="button"
            onClick={exportExcel}
            className="flex items-center gap-1 px-3 py-2 text-xs md:text-sm rounded-lg border border-emerald-500 text-emerald-600 hover:bg-emerald-50 transition"
          >
            <FaFileExcel />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 md:p-4 space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {fields.map((f) => (
            <div key={f.name} className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">
                {f.label}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  value={form[f.name] ?? ""}
                  onChange={handleChange}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  rows={2}
                />
              ) : (
                <input
                  type={f.type || "text"}
                  name={f.name}
                  value={form[f.name] ?? ""}
                  onChange={handleChange}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 text-xs md:text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              Batal Edit
            </button>
          )}
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 text-xs md:text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
          >
            <FaPlus />
            <span>{editId ? "Update Data" : "Tambah Data"}</span>
          </button>
        </div>
      </form>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="min-w-full text-xs md:text-sm">
          <thead className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white">
            <tr>
              {fields.map((f) => (
                <th
                  key={f.name}
                  className="px-3 py-2 border border-white/10 text-left"
                >
                  {f.label}
                </th>
              ))}
              <th className="px-3 py-2 border border-white/10 text-center">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={fields.length + 1}
                  className="px-3 py-4 text-center text-slate-500"
                >
                  Memuat data...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td
                  colSpan={fields.length + 1}
                  className="px-3 py-4 text-center text-slate-500"
                >
                  Belum ada data.
                </td>
              </tr>
            ) : (
              filteredItems.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {fields.map((f) => (
                    <td
                      key={f.name}
                      className="px-3 py-2 border border-slate-100 align-top"
                    >
                      {row[f.name]}
                    </td>
                  ))}
                  <td className="px-3 py-2 border border-slate-100 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="inline-flex items-center justify-center w-7 h-7 mr-1 rounded-full border border-blue-500 text-blue-600 hover:bg-blue-50"
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-red-500 text-red-600 hover:bg-red-50"
                      title="Hapus"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
