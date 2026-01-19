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

/* ================= OPTIONS ================= */
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

const DIVISI_OPTIONS = ["Operasional", "Office", "After Sales"];

const fmtRupiah = (v) =>
  "Rp " + Number(v || 0).toLocaleString("id-ID", { minimumFractionDigits: 0 });

export default function MasterKaryawan() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [filterDivisi, setFilterDivisi] = useState("");

  const [showTambah, setShowTambah] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const tableRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10; // jumlah data per halaman

  /* ================= USER LOGIN ================= */
  const userLogin = JSON.parse(localStorage.getItem("user") || "{}");
  const roleLogin = String(userLogin?.role || "").toLowerCase();
  const tokoLogin = userLogin?.tokoBertugas || userLogin?.toko || null;

  const [formTambah, setFormTambah] = useState({
    tanggalMasuk: "",
    nik: "",
    namaKaryawan: "",
    jabatan: "",
    divisi: "",
    tokoBertugas: "",
    gaji: "",
    referensi: "",
  });

  const filteredList = useMemo(() => {
    const q = search.toLowerCase();

    return list.filter((x) => {
      const matchSearch =
        String(x.NIK || "")
          .toLowerCase()
          .includes(q) ||
        String(x.NAMA || "")
          .toLowerCase()
          .includes(q) ||
        String(x.JABATAN || "")
          .toLowerCase()
          .includes(q) ||
        String(x.TOKO_BERTUGAS || "")
          .toLowerCase()
          .includes(q);

      const matchDivisi = !filterDivisi || x.DIVISI === filterDivisi;

      if (roleLogin === "admin" || roleLogin === "superadmin") {
        return matchSearch && matchDivisi;
      }

      return (
        matchSearch &&
        matchDivisi &&
        String(x.TOKO_BERTUGAS || "").toUpperCase() ===
          String(tokoLogin || "").toUpperCase()
      );
    });
  }, [list, search, filterDivisi, roleLogin, tokoLogin]);

  const totalPages = Math.ceil(filteredList.length / rowsPerPage);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredList.slice(start, start + rowsPerPage);
  }, [filteredList, currentPage]);

  const [formEdit, setFormEdit] = useState(null);

  /* ================= LISTENER ================= */
  useEffect(() => {
    const unsub = listenKaryawan((rows) => {
      setList(Array.isArray(rows) ? rows : []);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterDivisi]);

  /* ================= TOTAL GAJI ================= */
  const totalGaji = useMemo(
    () => filteredList.reduce((sum, x) => sum + Number(x.GAJI || 0), 0),
    [filteredList]
  );

  /* ================= EXPORT EXCEL ================= */
  const exportExcel = () => {
    const rows = filteredList.map((x, i) => ({
      No: i + 1,
      Tanggal_Masuk: x.TANGGAL_MASUK,
      NIK_Karyawan: x.NIK,
      Nama_Lengkap: x.NAMA,
      Jabatan: x.JABATAN,
      Divisi: x.DIVISI,
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
      !formTambah.divisi ||
      !formTambah.tokoBertugas
    ) {
      alert("⚠ Lengkapi semua field wajib!");
      return;
    }

    const payload = {
      TANGGAL_MASUK: formTambah.tanggalMasuk,
      NIK: formTambah.nik,
      NAMA: formTambah.namaKaryawan,
      JABATAN: formTambah.jabatan,
      DIVISI: formTambah.divisi,
      TOKO_BERTUGAS: formTambah.tokoBertugas,
      GAJI: Number(formTambah.gaji || 0),
      REFERENSI: formTambah.referensi,
    };

    await addKaryawan(payload);
    setShowTambah(false);
    setFormTambah({
      tanggalMasuk: "",
      nik: "",
      namaKaryawan: "",
      jabatan: "",
      divisi: "",
      tokoBertugas: "",
      gaji: "",
      referensi: "",
    });
  };

  /* ================= EDIT ================= */
  const openEdit = (row) => {
    setFormEdit({
      id: row.id,
      tanggalMasuk: row.TANGGAL_MASUK,
      nik: row.NIK,
      namaKaryawan: row.NAMA,
      referensi: row.REFERENSI || "",
      jabatan: row.JABATAN,
      divisi: row.DIVISI,
      gaji: row.GAJI,
      tokoBertugas: row.TOKO_BERTUGAS,
    });
    setShowEdit(true);
  };

  const submitEdit = async () => {
    if (!formEdit.divisi) {
      alert("⚠ Divisi wajib diisi!");
      return;
    }

    const payload = {
      TANGGAL_MASUK: formEdit.tanggalMasuk,
      NIK: formEdit.nik,
      NAMA: formEdit.namaKaryawan,
      REFERENSI: formEdit.referensi,
      JABATAN: formEdit.jabatan,
      DIVISI: formEdit.divisi,
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

  const hitungLamaKerja = (tanggalMasuk) => {
    if (!tanggalMasuk) return "-";

    const start = new Date(tanggalMasuk);
    const now = new Date();

    let tahun = now.getFullYear() - start.getFullYear();
    let bulan = now.getMonth() - start.getMonth();
    let hari = now.getDate() - start.getDate();

    if (hari < 0) {
      bulan--;
      const prevMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        0
      ).getDate();
      hari += prevMonth;
    }

    if (bulan < 0) {
      tahun--;
      bulan += 12;
    }

    return `${tahun} tahun ${bulan} bulan ${hari} hari`;
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

        <select
          className="border rounded px-3 py-2 text-sm"
          value={filterDivisi}
          onChange={(e) => setFilterDivisi(e.target.value)}
        >
          <option value="">Semua Divisi</option>
          {DIVISI_OPTIONS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>

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

      {/* TOTAL */}
      <div className="bg-slate-100 p-3 rounded">
        Total Gaji Karyawan: <b>{fmtRupiah(totalGaji)}</b>
      </div>

      {/* TABLE */}
      <div ref={tableRef} className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">No</th>
              <th className="p-2 border">Nama Karyawan</th>
              <th className="p-2 border">NIK Karyawan</th>
              <th className="p-2 border">Tanggal Join</th>
              <th className="p-2 border">Lama Bekerja</th>
              <th className="p-2 border">Refrensi</th>
              <th className="p-2 border">Jabatan</th>
              <th className="p-2 border">Divisi</th>
              <th className="p-2 border">Toko</th>
              <th className="p-2 border">Gaji</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((x, i) => {
              // hitung lama bekerja otomatis
              const lamaKerja = x.TANGGAL_MASUK
                ? Math.floor(
                    (new Date() - new Date(x.TANGGAL_MASUK)) /
                      (1000 * 60 * 60 * 24 * 30)
                  )
                : 0;

              return (
                <tr key={x.id}>
                  <td className="border p-2 text-center">
                    {(currentPage - 1) * rowsPerPage + i + 1}
                  </td>

                  <td className="border p-2">{x.NAMA}</td>
                  <td className="border p-2">{x.NIK}</td>
                  <td className="border p-2">{x.TANGGAL_MASUK}</td>

                  <td className="border p-2 text-center">
                    {hitungLamaKerja(x.TANGGAL_MASUK)}
                  </td>

                  <td className="border p-2">{x.REFERENSI || "-"}</td>

                  <td className="border p-2">{x.JABATAN}</td>
                  <td className="border p-2 font-semibold">{x.DIVISI}</td>

                  <td className="border p-2 text-indigo-700 font-semibold">
                    {x.TOKO_BERTUGAS}
                  </td>

                  <td className="border p-2 text-right">{fmtRupiah(x.GAJI)}</td>

                  <td className="border p-2 text-center space-x-2">
                    <button
                      onClick={() => openEdit(x)}
                      className="text-blue-600"
                    >
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
              );
            })}
          </tbody>
        </table>
        {/* PAGINATION */}
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-gray-600">
            Page {currentPage} dari {totalPages}
          </span>

          <div className="flex gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 border rounded 
        ${currentPage === i + 1 ? "bg-indigo-600 text-white" : ""}`}
              >
                {i + 1}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {(showTambah || showEdit) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-full max-w-md">
            <h3 className="font-bold mb-3">
              {showTambah ? "Tambah Karyawan" : "Edit Karyawan"}
            </h3>

            <div className="space-y-2 text-sm">
              <label>Tanggal Bergabung (Join)</label>
              <input
                type="date"
                className="input"
                value={
                  showTambah ? formTambah.tanggalMasuk : formEdit.tanggalMasuk
                }
                onChange={(e) =>
                  showTambah
                    ? setFormTambah({
                        ...formTambah,
                        tanggalMasuk: e.target.value,
                      })
                    : setFormEdit({ ...formEdit, tanggalMasuk: e.target.value })
                }
              />

              <label>NIK Karyawan</label>
              <input
                className="input"
                value={showTambah ? formTambah.nik : formEdit.nik}
                onChange={(e) =>
                  showTambah
                    ? setFormTambah({ ...formTambah, nik: e.target.value })
                    : setFormEdit({ ...formEdit, nik: e.target.value })
                }
              />

              <label>Referensi</label>
              <input
                className="input"
                value={showTambah ? formTambah.referensi : formEdit.referensi}
                onChange={(e) =>
                  showTambah
                    ? setFormTambah({
                        ...formTambah,
                        referensi: e.target.value,
                      })
                    : setFormEdit({
                        ...formEdit,
                        referensi: e.target.value,
                      })
                }
              />

              <label>Nama Lengkap</label>
              <input
                className="input"
                value={
                  showTambah ? formTambah.namaKaryawan : formEdit.namaKaryawan
                }
                onChange={(e) =>
                  showTambah
                    ? setFormTambah({
                        ...formTambah,
                        namaKaryawan: e.target.value,
                      })
                    : setFormEdit({ ...formEdit, namaKaryawan: e.target.value })
                }
              />

              <label>Jabatan</label>
              <input
                list="jabatan-list"
                className="input"
                value={showTambah ? formTambah.jabatan : formEdit.jabatan}
                onChange={(e) =>
                  showTambah
                    ? setFormTambah({ ...formTambah, jabatan: e.target.value })
                    : setFormEdit({ ...formEdit, jabatan: e.target.value })
                }
              />
              <datalist id="jabatan-list">
                {JABATAN_OPTIONS.map((j) => (
                  <option key={j} value={j} />
                ))}
              </datalist>

              <label>Divisi *</label>
              <input
                list="divisi-list"
                className="input"
                value={showTambah ? formTambah.divisi : formEdit.divisi}
                onChange={(e) =>
                  showTambah
                    ? setFormTambah({ ...formTambah, divisi: e.target.value })
                    : setFormEdit({ ...formEdit, divisi: e.target.value })
                }
              />
              <datalist id="divisi-list">
                {DIVISI_OPTIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>

              <label>Toko Bertugas</label>
              <select
                className="input"
                value={
                  showTambah ? formTambah.tokoBertugas : formEdit.tokoBertugas
                }
                onChange={(e) =>
                  showTambah
                    ? setFormTambah({
                        ...formTambah,
                        tokoBertugas: e.target.value,
                      })
                    : setFormEdit({ ...formEdit, tokoBertugas: e.target.value })
                }
              >
                <option value="">Pilih Toko</option>
                {TOKO_OPTIONS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>

              <label>Gaji</label>
              <input
                type="number"
                className="input"
                value={showTambah ? formTambah.gaji : formEdit.gaji}
                onChange={(e) =>
                  showTambah
                    ? setFormTambah({ ...formTambah, gaji: e.target.value })
                    : setFormEdit({ ...formEdit, gaji: e.target.value })
                }
              />
            </div>

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
