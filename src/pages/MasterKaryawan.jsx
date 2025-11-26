import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  listenKaryawan,
  addKaryawan,
  updateKaryawan,
  deleteKaryawan,
} from "../services/FirebaseService";

import { FaSearch, FaPlus, FaSave, FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const JABATAN_OPTIONS = [
  "DIREKTUR",
  "OWNER",
  "ADMIN",
  "SH (SALES HEAD)",
  "SL (SALES)",
  "SPG MAGANG",
];

export default function MasterKaryawan() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");

  const [showTambah, setShowTambah] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [formTambah, setFormTambah] = useState({
    tanggalMasuk: "",
    nik: "",
    namaKaryawan: "",
    jabatan: "",
  });

  const [formEdit, setFormEdit] = useState(null);
  const tableRef = useRef(null);

  // LISTENER FIREBASE
  useEffect(() => {
    const unsub = listenKaryawan((items) => {
      setList(Array.isArray(items) ? items : []);
    });
    return () => unsub && unsub();
  }, []);

  // FILTER SEARCH
  const filteredList = useMemo(() => {
    const q = search.toLowerCase();
    return list.filter(
      (x) =>
        (x.NIK || "").toLowerCase().includes(q) ||
        (x.NAMA || "").toLowerCase().includes(q) ||
        (x.JABATAN || "").toLowerCase().includes(q)
    );
  }, [list, search]);

  // EXPORT EXCEL
  const handleExcel = () => {
    const data = filteredList.map((x) => ({
      Tanggal_Masuk: x.TANGGAL_MASUK,
      NIK: x.NIK,
      Nama_Karyawan: x.NAMA,
      Jabatan: x.JABATAN,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "MASTER_KARYAWAN");
    XLSX.writeFile(wb, "MASTER_KARYAWAN.xlsx");
  };

  // EXPORT PDF
  const handlePDF = async () => {
    const input = tableRef.current;
    const canvas = await html2canvas(input, { scale: 1.1 });
    const img = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(img, "PNG", 0, 0, width, height);
    pdf.save("MASTER_KARYAWAN.pdf");
  };

  // ADD
  const submitTambah = async () => {
    try {
      if (!formTambah.tanggalMasuk || !formTambah.nik || !formTambah.namaKaryawan) {
        alert("Semua field wajib diisi");
        return;
      }

      const payload = {
        TANGGAL_MASUK: formTambah.tanggalMasuk,
        NIK: formTambah.nik,
        NAMA: formTambah.namaKaryawan,
        JABATAN: formTambah.jabatan,
      };

      await addKaryawan(payload);
      alert("Data berhasil ditambahkan");
      setShowTambah(false);
    } catch (e) {
      console.error(e);
      alert("Gagal menambah karyawan");
    }
  };

  // OPEN EDIT
  const openEdit = (row) => {
    setFormEdit({
      id: row.id,
      tanggalMasuk: row.TANGGAL_MASUK,
      nik: row.NIK,
      namaKaryawan: row.NAMA,
      jabatan: row.JABATAN,
    });
    setShowEdit(true);
  };

  // SUBMIT EDIT
  const submitEdit = async () => {
    try {
      const payload = {
        TANGGAL_MASUK: formEdit.tanggalMasuk,
        NIK: formEdit.nik,
        NAMA: formEdit.namaKaryawan,
        JABATAN: formEdit.jabatan,
      };

      await updateKaryawan(formEdit.id, payload);
      alert("Data berhasil diupdate");
      setShowEdit(false);
    } catch (e) {
      console.error(e);
      alert("Gagal update karyawan");
    }
  };

  // DELETE
  const handleDelete = async (id) => {
    if (!window.confirm("Hapus data ini?")) return;
    await deleteKaryawan(id);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">MASTER KARYAWAN</h2>

      {/* TOOLBAR */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center border rounded px-3 py-2">
          <FaSearch className="text-gray-600" />
          <input
            className="ml-2 outline-none text-sm"
            placeholder="Cari NIK / nama / jabatan"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowTambah(true)}
          className="px-3 py-2 bg-indigo-600 text-white rounded text-sm flex items-center"
        >
          <FaPlus className="mr-1" /> Tambah Karyawan
        </button>

        <button
          onClick={handleExcel}
          className="px-3 py-2 bg-green-600 text-white rounded text-sm flex items-center"
        >
          <FaFileExcel className="mr-1" /> Excel
        </button>

        <button
          onClick={handlePDF}
          className="px-3 py-2 bg-red-600 text-white rounded text-sm flex items-center"
        >
          <FaFilePdf className="mr-1" /> PDF
        </button>
      </div>

      {/* TABLE */}
      <div
        ref={tableRef}
        className="bg-white rounded shadow overflow-x-auto border"
      >
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">No</th>
              <th className="border p-2">Tanggal Masuk</th>
              <th className="border p-2">NIK</th>
              <th className="border p-2">Nama Karyawan</th>
              <th className="border p-2">Jabatan</th>
              <th className="border p-2 text-center">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center p-3">
                  Tidak ada data
                </td>
              </tr>
            ) : (
              filteredList.map((row, i) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border p-2 text-center">{i + 1}</td>
                  <td className="border p-2">{row.TANGGAL_MASUK}</td>
                  <td className="border p-2">{row.NIK}</td>
                  <td className="border p-2">{row.NAMA}</td>
                  <td className="border p-2">{row.JABATAN}</td>
                  <td className="border p-2 text-center space-x-2">
                    <button onClick={() => openEdit(row)} className="text-blue-600">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(row.id)} className="text-red-600">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL TAMBAH */}
      {showTambah && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start py-8 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded shadow p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Tambah Karyawan</h3>
              <button onClick={() => setShowTambah(false)} className="text-gray-600">
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <label>Tanggal Masuk</label>
                <input
                  type="date"
                  className="w-full border p-2 rounded"
                  value={formTambah.tanggalMasuk}
                  onChange={(e) =>
                    setFormTambah((p) => ({ ...p, tanggalMasuk: e.target.value }))
                  }
                />
              </div>

              <div>
                <label>No NIK</label>
                <input
                  className="w-full border p-2 rounded"
                  value={formTambah.nik}
                  onChange={(e) =>
                    setFormTambah((p) => ({ ...p, nik: e.target.value }))
                  }
                />
              </div>

              <div>
                <label>Nama Karyawan</label>
                <input
                  className="w-full border p-2 rounded"
                  value={formTambah.namaKaryawan}
                  onChange={(e) =>
                    setFormTambah((p) => ({ ...p, namaKaryawan: e.target.value }))
                  }
                />
              </div>

              <div>
                <label>Status Jabatan</label>
                <select
                  className="w-full border p-2 rounded"
                  value={formTambah.jabatan}
                  onChange={(e) =>
                    setFormTambah((p) => ({ ...p, jabatan: e.target.value }))
                  }
                >
                  <option value="">Pilih Jabatan</option>
                  {JABATAN_OPTIONS.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4 gap-2">
              <button
                className="px-3 py-2 bg-gray-400 text-white rounded"
                onClick={() => setShowTambah(false)}
              >
                <FaTimes className="inline mr-1" /> Batal
              </button>

              <button
                className="px-3 py-2 bg-indigo-600 text-white rounded"
                onClick={submitTambah}
              >
                <FaSave className="inline mr-1" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT */}
      {showEdit && formEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start py-8 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded shadow p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Edit Karyawan</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-600">
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <label>Tanggal Masuk</label>
                <input
                  type="date"
                  className="w-full border p-2 rounded"
                  value={formEdit.tanggalMasuk}
                  onChange={(e) =>
                    setFormEdit((p) => ({ ...p, tanggalMasuk: e.target.value }))
                  }
                />
              </div>

              <div>
                <label>No NIK</label>
                <input
                  className="w-full border p-2 rounded"
                  value={formEdit.nik}
                  onChange={(e) =>
                    setFormEdit((p) => ({ ...p, nik: e.target.value }))
                  }
                />
              </div>

              <div>
                <label>Nama Karyawan</label>
                <input
                  className="w-full border p-2 rounded"
                  value={formEdit.namaKaryawan}
                  onChange={(e) =>
                    setFormEdit((p) => ({ ...p, namaKaryawan: e.target.value }))
                  }
                />
              </div>

              <div>
                <label>Status Jabatan</label>
                <select
                  className="w-full border p-2 rounded"
                  value={formEdit.jabatan}
                  onChange={(e) =>
                    setFormEdit((p) => ({ ...p, jabatan: e.target.value }))
                  }
                >
                  <option value="">Pilih Jabatan</option>
                  {JABATAN_OPTIONS.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4 gap-2">
              <button
                className="px-3 py-2 bg-gray-400 text-white rounded"
                onClick={() => setShowEdit(false)}
              >
                <FaTimes className="inline mr-1" /> Batal
              </button>

              <button
                className="px-3 py-2 bg-blue-600 text-white rounded"
                onClick={submitEdit}
              >
                <FaSave className="inline mr-1" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
