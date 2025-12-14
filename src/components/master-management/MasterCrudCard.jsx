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
  // LISTEN DATA
  // ===============================
  useEffect(() => {
    if (typeof listenFn !== "function") return;

    const unsub = listenFn((data = []) => {
      setRows(data);
    });

    return () => unsub && unsub();
  }, [listenFn]);

  // ===============================
  // FORM HANDLER
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
      // ===============================
      // EDIT MODE
      // ===============================
      if (editId && updateFn) {
        await updateFn(editId, {
          ...form,
          updatedAt: new Date().toISOString(),
        });
        alert("Data berhasil diperbarui");
      }
      // ===============================
      // CREATE MODE (JIKA DIIZINKAN)
      // ===============================
      else if (!disableCreate && addFn) {
        await addFn({
          ...form,
          createdAt: new Date().toISOString(),
        });
        alert("Data berhasil ditambahkan");
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

  // ===============================
  // DELETE HANDLER
  // ===============================
  const handleDelete = async (id) => {
    if (!deleteFn) return;
    if (!window.confirm("Yakin hapus data ini?")) return;

    try {
      await deleteFn(id);
      alert("Data berhasil dihapus");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Gagal menghapus data");
    }
  };

  // ===============================
  // RENDER
  // ===============================
  return (
    <div>
      {/* HEADER */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      {/* ACTION BAR */}
      <div className="flex items-center gap-2 mb-3">
        {!disableCreate && addFn && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditId(null);
              setForm({});
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-1 text-sm hover:bg-blue-700"
          >
            <FaPlus /> Tambah Data
          </button>
        )}
      </div>

      {/* FORM */}
      {showForm && (
        <div className="bg-slate-50 p-4 rounded-lg border mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="block text-xs mb-1 text-slate-600">
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
              <FaSave />{" "}
              {submitLabel ||
                (editId || disableCreate ? "Edit Data" : "Simpan Data")}
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-200">
            <tr>
              <th className="p-2 border">No</th>
              {fields.map((f) => (
                <th key={f.name} className="p-2 border">
                  {f.label}
                </th>
              ))}
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="p-2 border text-center">{i + 1}</td>

                {fields.map((f) => (
                  <td key={f.name} className="p-2 border">
                    {r[f.name]}
                  </td>
                ))}

                <td className="p-2 border text-center space-x-2">
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => {
                      setEditId(r.id);
                      setForm(r);
                      setShowForm(true);
                    }}
                    title="Edit"
                  >
                    <FaEdit />
                  </button>

                  {deleteFn && (
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleDelete(r.id)}
                      title="Hapus"
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
                  className="p-3 text-center text-slate-500"
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
