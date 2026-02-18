import React, { useEffect, useState } from "react";
import * as FirebaseService from "../../services/FirebaseService";
import { FaPlus, FaSave, FaEdit, FaTrash, FaTimes } from "react-icons/fa";

export default function MasterCrudCard({
  title,
  subtitle,
  fields = [],
  listenFnName,
  addFnName,
  updateFnName,
  deleteFnName,
  submitLabel,
  onDataChange,
  disableCreate = false,
  externalRows,
  validateBeforeSave,
}) {
  const listenFn = FirebaseService[listenFnName];
  const addFn = addFnName ? FirebaseService[addFnName] : null;
  const updateFn = updateFnName ? FirebaseService[updateFnName] : null;
  const deleteFn = deleteFnName ? FirebaseService[deleteFnName] : null;

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // PAGINATION
  const [page, setPage] = useState(1);
  const perPage = 5;

  useEffect(() => {
    if (typeof listenFn !== "function") return;

    const unsub = listenFn((data = []) => {
      setRows(data);
      if (onDataChange) onDataChange(data);
    });

    return () => unsub && unsub();
  }, [listenFn]);

  const dataRows = externalRows || rows;
  const totalPage = Math.ceil(dataRows.length / perPage);
  const start = (page - 1) * perPage;
  const pagedRows = dataRows.slice(start, start + perPage);

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

       // ✅ VALIDASI CUSTOM (ANTI DUPLIKAT DLL)
    if (validateBeforeSave) {
      const valid = validateBeforeSave(form, rows, editId);
      if (!valid) return;
    }
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
        alert("❌ Fungsi simpan belum tersedia");
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
    await deleteFn(id);
  };

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-slate-500 mb-4">{subtitle}</p>

      {!disableCreate && (
        <button
          onClick={() => {
            setShowForm(true);
            setEditId(null);
            setForm({});
          }}
          className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm shadow"
        >
          <FaPlus /> Tambah Data
        </button>
      )}

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-lg p-5">
            <h3 className="text-lg font-bold mb-3">
              {editId ? "Edit Data" : "Tambah Data"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.name}>
                  <label className="text-xs text-slate-600">{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea
                      name={f.name}
                      value={form[f.name] || ""}
                      onChange={handleChange}
                      className="w-full border rounded-lg p-2"
                    />
                  ) : f.type === "select" ? (
                    <select
                      name={f.name}
                      value={form[f.name] || ""}
                      onChange={handleChange}
                      className="w-full border rounded-lg p-2"
                    >
                      <option value="">-- Pilih {f.label} --</option>
                      {(f.options || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={f.name}
                      value={form[f.name] || ""}
                      onChange={handleChange}
                      className="w-full border rounded-lg p-2"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg"
              >
                <FaTimes /> Batal
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                <FaSave /> {submitLabel || "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE MODERN */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-left">No</th>
              {fields.map((f) => (
                <th key={f.name} className="p-3 text-left">
                  {f.label}
                </th>
              ))}
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r, i) => (
              <tr
                key={r.id}
                className="border-t hover:bg-slate-50 transition"
              >
                <td className="p-3">{start + i + 1}</td>
                {fields.map((f) => (
                  <td key={f.name} className="p-3 whitespace-nowrap">
                    {r[f.name]}
                  </td>
                ))}
                <td className="p-3 text-center space-x-2">
                  <button
                    onClick={() => {
                      setEditId(r.id);
                      setForm(r);
                      setShowForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}

            {pagedRows.length === 0 && (
              <tr>
                <td
                  colSpan={fields.length + 2}
                  className="text-center p-6 text-slate-500"
                >
                  Tidak ada data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NAVIGATION PAGE */}
      <div className="flex justify-between items-center mt-4 text-sm">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-50"
        >
          ⬅ Prev
        </button>
        <span>
          Page {page} / {totalPage || 1}
        </span>
        <button
          disabled={page === totalPage}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-50"
        >
          Next ➡
        </button>
      </div>
    </div>
  );
}
