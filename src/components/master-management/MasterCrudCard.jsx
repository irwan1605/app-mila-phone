// src/components/master-management/MasterCrudCard.jsx
import React, { useEffect, useState } from "react";
import * as FirebaseService from "../../services/FirebaseService";
import {
  FaPlus,
  FaSave,
  FaEdit,
  FaTrash,
  FaTimes,
} from "react-icons/fa";

export default function MasterCrudCard({
  title,
  subtitle,
  collectionKey,
  fields = [],
  excelFileName,
  listenFnName,
  addFnName,
  updateFnName,
  deleteFnName,
  submitLabel,
  disableCreate = false,
}) {
  const listenFn = FirebaseService[listenFnName];
  const addFn = addFnName ? FirebaseService[addFnName] : null;
  const updateFn = updateFnName ? FirebaseService[updateFnName] : null;
  const deleteFn = deleteFnName ? FirebaseService[deleteFnName] : null;

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // ===============================
  // LISTENER REALTIME
  // ===============================
  useEffect(() => {
    if (typeof listenFn !== "function") return;

    const unsub = listenFn((data = []) => {
      setRows(data);
    });

    return () => unsub && unsub();
  }, [listenFn]);

  // ===============================
  // HANDLER
  // ===============================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const resetForm = () => {
    setForm({});
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    try {
      if (editId && updateFn) {
        await updateFn(editId, {
          ...form,
          updatedAt: new Date().toISOString(),
        });
      } else if (!disableCreate && addFn) {
        await addFn({
          ...form,
          createdAt: new Date().toISOString(),
        });
      } else {
        alert("Aksi tidak diizinkan");
        return;
      }

      resetForm();
    } catch (err) {
      console.error("Submit error:", err);
      alert("Gagal menyimpan data");
    }
  };

  const handleDelete = async (id) => {
    if (!deleteFn) return;
    if (!window.confirm("Yakin hapus data ini?")) return;

    try {
      await deleteFn(id);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Gagal menghapus data");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-slate-500 mb-4">{subtitle}</p>

      {/* ACTION */}
      {!disableCreate && addFn && (
        <button
          onClick={() => {
            setShowForm(true);
            setEditId(null);
            setForm({});
          }}
          className="mb-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm"
        >
          <FaPlus /> Tambah Data
        </button>
      )}

      {/* FORM */}
      {showForm && (
        <div className="bg-slate-50 p-4 rounded-lg border mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="text-xs text-slate-600">
                  {f.label}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    name={f.name}
                    value={form[f.name] || ""}
                    onChange={handleChange}
                    className="w-full border p-2 rounded"
                  />
                ) : (
                  <input
                    type={f.type || "text"}
                    name={f.name}
                    value={form[f.name] || ""}
                    onChange={handleChange}
                    className="w-full border p-2 rounded"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={resetForm}
              className="px-3 py-1 bg-gray-400 text-white rounded flex items-center gap-1"
            >
              <FaTimes /> Batal
            </button>
            <button
              onClick={handleSubmit}
              className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-1"
            >
              <FaSave /> {submitLabel || "Simpan"}
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-slate-200">
            <tr>
              <th className="p-2">No</th>
              {fields.map((f) => (
                <th key={f.name} className="p-2">{f.label}</th>
              ))}
              <th className="p-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 text-center">{i + 1}</td>
                {fields.map((f) => (
                  <td key={f.name} className="p-2">
                    {r[f.name]}
                  </td>
                ))}
                <td className="p-2 text-center space-x-2">
                  <button
                    onClick={() => {
                      setEditId(r.id);
                      setForm(r);
                      setShowForm(true);
                    }}
                    className="text-blue-600"
                  >
                    <FaEdit />
                  </button>
                  {deleteFn && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-red-600"
                    >
                      <FaTrash />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={fields.length + 2}
                  className="text-center py-4 text-slate-500"
                >
                  Tidak ada data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
