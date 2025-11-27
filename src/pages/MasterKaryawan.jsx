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

const JABATAN_OPTIONS = [
  "DIREKTUR",
  "OWNER",
  "ADMIN",
  "SH (SALES HEAD)",
  "SL (SALES)",
  "SPG MAGANG",
];

const fmtRupiah = (v) =>
  "Rp " + Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
  });

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
    gaji: "",
  });

  const [formEdit, setFormEdit] = useState(null);
  const tableRef = useRef(null);

  // LISTENER FIREBASE (REALTIME)
  useEffect(() => {
    const unsub = listenKaryawan((items) => {
      setList(Array.isArray(items) ? items : []);
    });
    return () => unsub && unsub();
  }, []);

  // FILTER SEARCH
  const filteredList = useMemo(() => {
    const q = (search || "").toLowerCase();
    return (list || []).filter((x) => {
      const nik = (x.NIK || "").toLowerCase();
      const nama = (x.NAMA || "").toLowerCase();
      const jabatan = (x.JABATAN || "").toLowerCase();
      const gaji = String(x.GAJI ?? "")
        .toLowerCase()
        .replace(/rp|\.|,/g, "");
      return (
        nik.includes(q) ||
        nama.includes(q) ||
        jabatan.includes(q) ||
        gaji.includes(q)
      );
    });
  }, [list, search]);

  // TOTAL GAJI (FITUR GAJI)
  const totalGaji = useMemo(
    () =>
      (list || []).reduce((sum, x) => sum + Number(x.GAJI || 0), 0),
    [list]
  );

  // EXPORT EXCEL
  const handleExcel = () => {
    const data = filteredList.map((x) => ({
      Tanggal_Masuk: x.TANGGAL_MASUK,
      NIK: x.NIK,
      Nama_Karyawan: x.NAMA,
      Jabatan: x.JABATAN,
      Gaji: Number(x.GAJI || 0),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "MASTER_KARYAWAN");
    XLSX.writeFile(wb, "MASTER_KARYAWAN.xlsx");
  };

  // EXPORT PDF (TABEL)
  const handlePDF = async () => {
    const input = tableRef.current;
    if (!input) return;

    const canvas = await html2canvas(input, { scale: 1.1 });
    const img = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(img, "PNG", 0, 0, width, height);
    pdf.save("MASTER_KARYAWAN.pdf");
  };

  // ✅ CETAK SLIP GAJI 1 BULAN PER ORANG
  const cetakSlipGaji = (row) => {
    // Minta bulan (format: 2025-01)
    const defaultMonth = new Date().toISOString().slice(0, 7);
    const bulanInput =
      window.prompt(
        "Masukkan bulan slip gaji (format: YYYY-MM), contoh: " +
          defaultMonth,
        defaultMonth
      ) || defaultMonth;

    const pdf = new jsPDF();

    // HEADER + LOGO (logo bisa disesuaikan: misalnya di bagian atas slip)
    // Jika Anda punya base64 logo, bisa pakai pdf.addImage(base64Logo, "PNG", x, y, w, h);
    pdf.setFontSize(14);
    pdf.text("SLIP GAJI KARYAWAN", 70, 20);

    // Info Perusahaan / Logo placeholder
    pdf.setFontSize(10);
    pdf.text("PT. NAMA PERUSAHAAN / TOKO", 20, 30);
    pdf.text("Periode: " + bulanInput, 20, 36);

    // Garis
    pdf.line(20, 40, 190, 40);

    // DATA KARYAWAN
    pdf.setFontSize(11);
    pdf.text(`Nama        : ${row.NAMA || "-"}`, 20, 50);
    pdf.text(`NIK         : ${row.NIK || "-"}`, 20, 58);
    pdf.text(`Jabatan     : ${row.JABATAN || "-"}`, 20, 66);
    pdf.text(`Tanggal Masuk : ${row.TANGGAL_MASUK || "-"}`, 20, 74);

    // GAJI (anggap GAJI = gaji per bulan)
    const gajiNumber = Number(row.GAJI || 0);
    pdf.text(
      `Gaji Pokok Bulanan : Rp ${gajiNumber.toLocaleString("id-ID")}`,
      20,
      90
    );

    // FOOTER TTD
    pdf.line(20, 110, 190, 110);
    pdf.text("Disetujui,", 20, 120);
    pdf.text("Bagian HRD / Keuangan", 20, 126);
    pdf.text("Karyawan,", 140, 120);

    pdf.save(
      `SLIP_GAJI_${row.NAMA || "KARYAWAN"}_${bulanInput}.pdf`
    );
  };

  // ADD
  const submitTambah = async () => {
    try {
      if (
        !formTambah.tanggalMasuk ||
        !formTambah.nik ||
        !formTambah.namaKaryawan
      ) {
        alert("Semua field wajib diisi");
        return;
      }

      const gajiNumber = Number(formTambah.gaji || 0);
      if (Number.isNaN(gajiNumber) || gajiNumber < 0) {
        alert("Gaji harus berupa angka dan tidak boleh negatif.");
        return;
      }

      const payload = {
        TANGGAL_MASUK: formTambah.tanggalMasuk,
        NIK: formTambah.nik,
        NAMA: formTambah.namaKaryawan,
        JABATAN: formTambah.jabatan,
        GAJI: gajiNumber,
      };

      await addKaryawan(payload);
      alert("Data berhasil ditambahkan");

      setFormTambah({
        tanggalMasuk: "",
        nik: "",
        namaKaryawan: "",
        jabatan: "",
        gaji: "",
      });
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
      tanggalMasuk: row.TANGGAL_MASUK || "",
      nik: row.NIK || "",
      namaKaryawan: row.NAMA || "",
      jabatan: row.JABATAN || "",
      gaji: row.GAJI ?? "",
    });
    setShowEdit(true);
  };

  // SUBMIT EDIT
  const submitEdit = async () => {
    try {
      if (
        !formEdit.tanggalMasuk ||
        !formEdit.nik ||
        !formEdit.namaKaryawan
      ) {
        alert("Semua field wajib diisi");
        return;
      }

      const gajiNumber = Number(formEdit.gaji || 0);
      if (Number.isNaN(gajiNumber) || gajiNumber < 0) {
        alert("Gaji harus berupa angka dan tidak boleh negatif.");
        return;
      }

      const payload = {
        TANGGAL_MASUK: formEdit.tanggalMasuk,
        NIK: formEdit.nik,
        NAMA: formEdit.namaKaryawan,
        JABATAN: formEdit.jabatan,
        GAJI: gajiNumber,
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
        <div className="flex items-center border rounded px-3 py-2 bg-white shadow-sm">
          <FaSearch className="text-gray-600" />
          <input
            className="ml-2 outline-none text-sm"
            placeholder="Cari NIK / nama / jabatan / gaji"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowTambah(true)}
          className="px-3 py-2 bg-indigo-600 text-white rounded text-sm flex items-center shadow-sm hover:bg-indigo-700"
        >
          <FaPlus className="mr-1" /> Tambah Karyawan
        </button>

        <button
          onClick={handleExcel}
          className="px-3 py-2 bg-green-600 text-white rounded text-sm flex items-center shadow-sm hover:bg-green-700"
        >
          <FaFileExcel className="mr-1" /> Excel
        </button>

        <button
          onClick={handlePDF}
          className="px-3 py-2 bg-red-600 text-white rounded text-sm flex items-center shadow-sm hover:bg-red-700"
        >
          <FaFilePdf className="mr-1" /> PDF
        </button>
      </div>

      {/* FITUR GAJI – RINGKASAN */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-indigo-50 border border-emerald-100 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs sm:text-sm shadow-sm">
        <div>
          <div className="font-semibold text-slate-700">
            Total Gaji Seluruh Karyawan
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-700">
            {fmtRupiah(totalGaji)}
          </div>
        </div>
        <div className="text-[11px] text-slate-500 mt-2 sm:mt-0">
          Data diambil realtime dari Firebase — setiap tambah / edit karyawan
          akan otomatis mengubah total gaji.
        </div>
      </div>

      {/* TABEL DATA */}
      <div
        ref={tableRef}
        className="bg-white rounded-lg shadow-sm overflow-x-auto"
      >
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border text-left text-xs">
                Tanggal Masuk
              </th>
              <th className="px-3 py-2 border text-left text-xs">NIK</th>
              <th className="px-3 py-2 border text-left text-xs">
                Nama Karyawan
              </th>
              <th className="px-3 py-2 border text-left text-xs">Jabatan</th>
              <th className="px-3 py-2 border text-right text-xs">Gaji</th>
              <th className="px-3 py-2 border text-center text-xs">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-4 text-center text-gray-500 text-sm"
                >
                  Belum ada data karyawan.
                </td>
              </tr>
            ) : (
              filteredList.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border text-xs">
                    {row.TANGGAL_MASUK}
                  </td>
                  <td className="px-3 py-2 border text-xs">{row.NIK}</td>
                  <td className="px-3 py-2 border text-xs">{row.NAMA}</td>
                  <td className="px-3 py-2 border text-xs">{row.JABATAN}</td>
                  <td className="px-3 py-2 border text-xs text-right">
                    {fmtRupiah(row.GAJI)}
                  </td>
                  <td className="px-3 py-2 border text-center text-xs">
                    <button
                      onClick={() => cetakSlipGaji(row)}
                      className="inline-flex items-center px-2 py-1 text-emerald-600 hover:text-emerald-800 mr-2"
                    >
                      <FaFilePdf className="mr-1" /> Slip
                    </button>
                    <button
                      onClick={() => openEdit(row)}
                      className="inline-flex items-center px-2 py-1 text-blue-600 hover:text-blue-800 mr-2"
                    >
                      <FaEdit className="mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="inline-flex items-center px-2 py-1 text-red-600 hover:text-red-800"
                    >
                      <FaTrash className="mr-1" /> Hapus
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Tambah Karyawan</h3>
              <button
                onClick={() => setShowTambah(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block mb-1 text-gray-700 text-xs">
                  Tanggal Masuk
                </label>
                <input
                  type="date"
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={formTambah.tanggalMasuk}
                  onChange={(e) =>
                    setFormTambah((p) => ({
                      ...p,
                      tanggalMasuk: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="block mb-1 text-gray-700 text-xs">NIK</label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={formTambah.nik}
                  onChange={(e) =>
                    setFormTambah((p) => ({
                      ...p,
                      nik: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="block mb-1 text-gray-700 text-xs">
                  Nama Karyawan
                </label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={formTambah.namaKaryawan}
                  onChange={(e) =>
                    setFormTambah((p) => ({
                      ...p,
                      namaKaryawan: e.target.value,
                    }))
                  }
                />
              </div>

              {/* STATUS JABATAN – BISA KETIK MANUAL + DROPDOWN */}
              <div>
                <label className="block mb-1 text-gray-700 text-xs">
                  Status Jabatan
                </label>
                <input
                  list="jabatan-list"
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={formTambah.jabatan}
                  onChange={(e) =>
                    setFormTambah((p) => ({
                      ...p,
                      jabatan: e.target.value,
                    }))
                  }
                  placeholder="Ketik / pilih jabatan (misal: TEKNISI)"
                />
                <datalist id="jabatan-list">
                  {JABATAN_OPTIONS.map((j) => (
                    <option key={j} value={j} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block mb-1 text-gray-700 text-xs">
                  Gaji (Rp)
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={formTambah.gaji}
                  onChange={(e) =>
                    setFormTambah((p) => ({
                      ...p,
                      gaji: e.target.value,
                    }))
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowTambah(false)}
                className="px-3 py-1 border rounded text-sm flex items-center"
              >
                <FaTimes className="mr-1" /> Batal
              </button>
              <button
                onClick={submitTambah}
                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm flex items-center"
              >
                <FaSave className="mr-1" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT */}
      {showEdit && formEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Edit Karyawan</h3>
              <button
                onClick={() => setShowEdit(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block mb-1 text-gray-700 text-xs">
                  Tanggal Masuk
                </label>
                <input
                  type="date"
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={formEdit.tanggalMasuk}
                  onChange={(e) =>
                    setFormEdit((p) => ({
                      ...p,
                      tanggalMasuk: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="block mb-1 text-gray-700 text-xs">NIK</label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={formEdit.nik}
                  onChange={(e) =>
                    setFormEdit((p) => ({
                      ...p,
                      nik: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="block mb-1 text-gray-700 text-xs">
                  Nama Karyawan
                </label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={formEdit.namaKaryawan}
                  onChange={(e) =>
                    setFormEdit((p) => ({
                      ...p,
                      namaKaryawan: e.target.value,
                    }))
                  }
                />
              </div>

              {/* STATUS JABATAN EDIT – INPUT + DATALIST */}
              <div>
                <label className="block mb-1 text-gray-700 text-xs">
                  Status Jabatan
                </label>
                <input
                  list="jabatan-list-edit"
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={formEdit.jabatan}
                  onChange={(e) =>
                    setFormEdit((p) => ({
                      ...p,
                      jabatan: e.target.value,
                    }))
                  }
                  placeholder="Ketik / pilih jabatan (misal: TEKNISI)"
                />
                <datalist id="jabatan-list-edit">
                  {JABATAN_OPTIONS.map((j) => (
                    <option key={j} value={j} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block mb-1 text-gray-700 text-xs">
                  Gaji (Rp)
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={formEdit.gaji}
                  onChange={(e) =>
                    setFormEdit((p) => ({
                      ...p,
                      gaji: e.target.value,
                    }))
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowEdit(false)}
                className="px-3 py-1 border rounded text-sm flex items-center"
              >
                <FaTimes className="mr-1" /> Batal
              </button>
              <button
                onClick={submitEdit}
                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm flex items-center"
              >
                <FaSave className="mr-1" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
