// src/pages/MasterKaryawan.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  listenKaryawan,
  addKaryawan,
  updateKaryawan,
  deleteKaryawan,
} from "../services/FirebaseService";

import {
  FaSearch,
  FaPlus,
  FaSave,
  FaEdit,
  FaTrash,
  FaTimes,
} from "react-icons/fa";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ================= MASTER TOKO ================= */
const TOKO_OPTIONS = [
  "CILANGKAP PUSAT",
  "CIBINONG",
  "GAS ALAM",
  "CITEUREUP",
  "CIRACAS",
  "METLAND 1",
  "METLAND 2",
  "PITARA",
  "KOTA WISATA",
  "SAWANGAN",
];

const JABATAN_OPTIONS = [
  "DIREKTUR",
  "OWNER",
  "ADMIN",
  "SH (SALES HEAD)",
  "SL (SALES)",
  "SPG MAGANG",
];

const fmtRupiah = (v) =>
  "Rp " +
  Number(v || 0).toLocaleString("id-ID", { minimumFractionDigits: 0 });

export default function MasterKaryawan() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [showTambah, setShowTambah] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const tableRef = useRef(null);

  /* ================= USER LOGIN ================= */
  const userLogin = JSON.parse(localStorage.getItem("user") || "{}");
  const roleLogin = String(userLogin?.role || "").toLowerCase();
  const tokoLogin = userLogin?.tokoBertugas || userLogin?.toko || null;

  /* ================= FORM ================= */
  const [formTambah, setFormTambah] = useState({
    tanggalMasuk: "",
    nik: "",
    namaKaryawan: "",
    jabatan: "",
    gaji: "",
    tokoBertugas: "",
  });

  const [formEdit, setFormEdit] = useState(null);

  /* ================= LISTENER FIREBASE ================= */
  useEffect(() => {
    const unsub = listenKaryawan((rows) => {
      setList(Array.isArray(rows) ? rows : []);
    });
    return () => unsub && unsub();
  }, []);

  /* ================= FILTER ================= */
  const filteredList = useMemo(() => {
    const q = search.toLowerCase();

    return list.filter((x) => {
      const match =
        String(x.NIK || "").toLowerCase().includes(q) ||
        String(x.NAMA || "").toLowerCase().includes(q) ||
        String(x.JABATAN || "").toLowerCase().includes(q) ||
        String(x.TOKO_BERTUGAS || "").toLowerCase().includes(q);

      if (roleLogin === "admin" || roleLogin === "superadmin") {
        return match;
      }

      return (
        match &&
        String(x.TOKO_BERTUGAS || "").toUpperCase() ===
          String(tokoLogin || "").toUpperCase()
      );
    });
  }, [list, search, roleLogin, tokoLogin]);

  /* ================= TOTAL GAJI ================= */
  const totalGaji = useMemo(
    () => filteredList.reduce((sum, x) => sum + Number(x.GAJI || 0), 0),
    [filteredList]
  );

  /* ================= EXPORT EXCEL ================= */
  const exportExcel = () => {
    const rows = filteredList.map((x) => ({
      Tanggal_Masuk: x.TANGGAL_MASUK,
      NIK: x.NIK,
      Nama: x.NAMA,
      Jabatan: x.JABATAN,
      Toko: x.TOKO_BERTUGAS,
      Gaji: Number(x.GAJI || 0),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MASTER_KARYAWAN");
    XLSX.writeFile(wb, "MASTER_KARYAWAN.xlsx");
  };

  /* ================= EXPORT PDF ================= */
  const exportPDF = async () => {
    const el = tableRef.current;
    if (!el) return;

    const canvas = await html2canvas(el, { scale: 1.2 });
    const img = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;

    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save("MASTER_KARYAWAN.pdf");
  };

  /* ================= TAMBAH ================= */
  const submitTambah = async () => {
    if (
      !formTambah.tanggalMasuk ||
      !formTambah.nik ||
      !formTambah.namaKaryawan ||
      !formTambah.tokoBertugas
    ) {
      alert("Lengkapi semua field wajib");
      return;
    }

    const payload = {
      TANGGAL_MASUK: formTambah.tanggalMasuk,
      NIK: formTambah.nik,
      NAMA: formTambah.namaKaryawan,
      JABATAN: formTambah.jabatan,
      GAJI: Number(formTambah.gaji || 0),
      TOKO_BERTUGAS: formTambah.tokoBertugas,
    };

    await addKaryawan(payload);
    setShowTambah(false);
    setFormTambah({
      tanggalMasuk: "",
      nik: "",
      namaKaryawan: "",
      jabatan: "",
      gaji: "",
      tokoBertugas: "",
    });
  };

  /* ================= EDIT ================= */
  const openEdit = (row) => {
    setFormEdit({
      id: row.id,
      tanggalMasuk: row.TANGGAL_MASUK,
      nik: row.NIK,
      namaKaryawan: row.NAMA,
      jabatan: row.JABATAN,
      gaji: row.GAJI,
      tokoBertugas: row.TOKO_BERTUGAS,
    });
    setShowEdit(true);
  };

  const submitEdit = async () => {
    const payload = {
      TANGGAL_MASUK: formEdit.tanggalMasuk,
      NIK: formEdit.nik,
      NAMA: formEdit.namaKaryawan,
      JABATAN: formEdit.jabatan,
      GAJI: Number(formEdit.gaji || 0),
      TOKO_BERTUGAS: formEdit.tokoBertugas,
    };

    await updateKaryawan(formEdit.id, payload);
    setShowEdit(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus karyawan ini?")) return;
    await deleteKaryawan(id);
  };

  /* ================= UI ================= */
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">MASTER KARYAWAN</h2>

      {/* TOOLBAR */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center border rounded px-3 py-2 bg-white">
          <FaSearch />
          <input
            className="ml-2 outline-none text-sm"
            placeholder="Cari NIK / Nama / Jabatan / Toko"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowTambah(true)}
          className="bg-indigo-600 text-white px-3 py-2 rounded flex items-center"
        >
          <FaPlus className="mr-1" /> Tambah
        </button>

        <button
          onClick={exportExcel}
          className="bg-green-600 text-white px-3 py-2 rounded flex items-center"
        >
          <FaFileExcel className="mr-1" /> Excel
        </button>

        <button
          onClick={exportPDF}
          className="bg-red-600 text-white px-3 py-2 rounded flex items-center"
        >
          <FaFilePdf className="mr-1" /> PDF
        </button>
      </div>

      {/* TOTAL GAJI */}
      <div className="bg-slate-100 p-3 rounded">
        Total Gaji Karyawan: <b>{fmtRupiah(totalGaji)}</b>
      </div>

      {/* TABLE */}
      <div ref={tableRef} className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Tanggal</th>
              <th className="p-2 border">NIK</th>
              <th className="p-2 border">Nama</th>
              <th className="p-2 border">Jabatan</th>
              <th className="p-2 border">Toko</th>
              <th className="p-2 border">Gaji</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((x) => (
              <tr key={x.id}>
                <td className="border p-2">{x.TANGGAL_MASUK}</td>
                <td className="border p-2">{x.NIK}</td>
                <td className="border p-2">{x.NAMA}</td>
                <td className="border p-2">{x.JABATAN}</td>
                <td className="border p-2 font-semibold text-indigo-700">
                  {x.TOKO_BERTUGAS}
                </td>
                <td className="border p-2 text-right">
                  {fmtRupiah(x.GAJI)}
                </td>
                <td className="border p-2 text-center space-x-2">
                  <button onClick={() => openEdit(x)} className="text-blue-600">
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(x.id)}
                    className="text-red-600"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL TAMBAH & EDIT */}
      {(showTambah || showEdit) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-full max-w-md">
            <h3 className="font-bold mb-3">
              {showTambah ? "Tambah Karyawan" : "Edit Karyawan"}
            </h3>

            {(showTambah ? formTambah : formEdit) && (
              <div className="space-y-2 text-sm">
                <input
                  type="date"
                  className="input"
                  value={
                    showTambah
                      ? formTambah.tanggalMasuk
                      : formEdit.tanggalMasuk
                  }
                  onChange={(e) =>
                    showTambah
                      ? setFormTambah({
                          ...formTambah,
                          tanggalMasuk: e.target.value,
                        })
                      : setFormEdit({
                          ...formEdit,
                          tanggalMasuk: e.target.value,
                        })
                  }
                />

                <input
                  className="input"
                  placeholder="NIK"
                  value={showTambah ? formTambah.nik : formEdit.nik}
                  onChange={(e) =>
                    showTambah
                      ? setFormTambah({
                          ...formTambah,
                          nik: e.target.value,
                        })
                      : setFormEdit({ ...formEdit, nik: e.target.value })
                  }
                />

                <input
                  className="input"
                  placeholder="Nama Karyawan"
                  value={
                    showTambah
                      ? formTambah.namaKaryawan
                      : formEdit.namaKaryawan
                  }
                  onChange={(e) =>
                    showTambah
                      ? setFormTambah({
                          ...formTambah,
                          namaKaryawan: e.target.value,
                        })
                      : setFormEdit({
                          ...formEdit,
                          namaKaryawan: e.target.value,
                        })
                  }
                />

                <input
                  list="jabatan-list"
                  className="input"
                  placeholder="Jabatan"
                  value={showTambah ? formTambah.jabatan : formEdit.jabatan}
                  onChange={(e) =>
                    showTambah
                      ? setFormTambah({
                          ...formTambah,
                          jabatan: e.target.value,
                        })
                      : setFormEdit({
                          ...formEdit,
                          jabatan: e.target.value,
                        })
                  }
                />

                <datalist id="jabatan-list">
                  {JABATAN_OPTIONS.map((j) => (
                    <option key={j} value={j} />
                  ))}
                </datalist>

                <select
                  className="input"
                  value={
                    showTambah
                      ? formTambah.tokoBertugas
                      : formEdit.tokoBertugas
                  }
                  onChange={(e) =>
                    showTambah
                      ? setFormTambah({
                          ...formTambah,
                          tokoBertugas: e.target.value,
                        })
                      : setFormEdit({
                          ...formEdit,
                          tokoBertugas: e.target.value,
                        })
                  }
                >
                  <option value="">Pilih Toko</option>
                  {TOKO_OPTIONS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>

                <input
                  type="number"
                  className="input"
                  placeholder="Gaji"
                  value={showTambah ? formTambah.gaji : formEdit.gaji}
                  onChange={(e) =>
                    showTambah
                      ? setFormTambah({
                          ...formTambah,
                          gaji: e.target.value,
                        })
                      : setFormEdit({
                          ...formEdit,
                          gaji: e.target.value,
                        })
                  }
                />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowTambah(false);
                  setShowEdit(false);
                }}
                className="border px-3 py-1 rounded"
              >
                <FaTimes /> Batal
              </button>
              <button
                onClick={showTambah ? submitTambah : submitEdit}
                className="bg-indigo-600 text-white px-3 py-1 rounded"
              >
                <FaSave /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #ccc;
          padding: 8px;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}
