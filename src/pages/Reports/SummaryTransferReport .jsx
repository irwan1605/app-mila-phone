import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebase/FirebaseInit";
import { useNavigate } from "react-router-dom";
import { FaPrint } from "react-icons/fa";


/* ================= UTIL ================= */
const formatDate = (d) => (d ? new Date(d).toLocaleDateString("id-ID") : "-");

export default function SummaryTransferReport() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({
    tanggal: "",
    noDO: "",
    toko: "",
    barang: "",
    imei: "",
    status: "",
  });

  /* PAGINATION */
  const [page, setPage] = useState(1);
  const limit = 10;

  /* ================= LOAD DATA REALTIME ================= */
  useEffect(() => {
    return onValue(ref(db, "transfer_barang"), (snap) => {
      const arr = [];

      snap.forEach((c) => {
        const val = c.val();
        if (val && typeof val === "object") {
          arr.push({
            id: c.key,
            ...val,
          });
        }
      });

      setRows(arr.reverse()); // terbaru di atas
    });
  }, []);

  /* ================= FLATTEN ================= */
  const tableRows = useMemo(() => {
    return rows.map((trx) => ({
      id: trx.id,
      tanggal: trx.tanggal || trx.createdAt,
      noDO: trx.noDo || "-",
      noSuratJalan: trx.noSuratJalan || "-",
      tokoAsal: trx.tokoPengirim || "-",
      tokoTujuan: trx.ke || "-",
      kategori: trx.kategori || "-",
      brand: trx.brand || "-",
      barang: trx.barang || "-",
      imei: Array.isArray(trx.imeis) ? trx.imeis.join(", ") : "-",
      qty: trx.qty || 0,
      status: trx.status || "Pending",
    }));
  }, [rows]);

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    return tableRows.filter((r) => {
      return (
        (!filter.tanggal ||
          formatDate(r.tanggal) === formatDate(filter.tanggal)) &&
        (!filter.noDO ||
          r.noDO.toLowerCase().includes(filter.noDO.toLowerCase())) &&
        (!filter.toko ||
          r.tokoAsal.toLowerCase().includes(filter.toko.toLowerCase()) ||
          r.tokoTujuan.toLowerCase().includes(filter.toko.toLowerCase())) &&
        (!filter.barang ||
          r.barang.toLowerCase().includes(filter.barang.toLowerCase())) &&
        (!filter.imei || String(r.imei).includes(filter.imei)) &&
        (!filter.status ||
          r.status.toLowerCase().includes(filter.status.toLowerCase()))
      );
    });
  }, [tableRows, filter]);

  /* ================= PAGINATION ================= */
  const totalPage = Math.ceil(filtered.length / limit);
  const start = (page - 1) * limit;
  const current = filtered.slice(start, start + limit);

  /* ================= EXPORT ================= */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary Transfer");

    const buf = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(new Blob([buf]), `Summary_Transfer_${Date.now()}.xlsx`);
  };

  return (
    <div className="p-5 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">📦 Summary Transfer Barang</h2>

      {/* FILTER */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
        <input
          type="date"
           className="input"
          onChange={(e) => setFilter({ ...filter, tanggal: e.target.value })}
        />
        <input
          placeholder="No DO"
           className="input"
          onChange={(e) => setFilter({ ...filter, noDO: e.target.value })}
        />
        <input
          placeholder="Nama Toko"
           className="input"
          onChange={(e) => setFilter({ ...filter, toko: e.target.value })}
        />
        <input
          placeholder="Nama Barang"
           className="input"
          onChange={(e) => setFilter({ ...filter, barang: e.target.value })}
        />
        <input
          placeholder="IMEI"
           className="input"
          onChange={(e) => setFilter({ ...filter, imei: e.target.value })}
        />
        <input
          placeholder="Status"
           className="input"
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        />
      </div>

      <button
        onClick={exportExcel}
        className="mb-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"
      >
        ⬇ Export Excel
      </button>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="min-w-[1500px] text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>No DO</th>
              <th>No SJ</th>
              <th>Toko Asal</th>
              <th>Toko Tujuan</th>
              <th>Brand</th>
              <th>Barang</th>
              <th>IMEI</th>
              <th>QTY</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {current.map((r, i) => (
              <tr key={r.id} className="border-t hover:bg-slate-50">
                <td>{start + i + 1}</td>
                <td>{formatDate(r.tanggal)}</td>
                <td>{r.noDO}</td>
                <td>{r.noSuratJalan}</td>
                <td>{r.tokoAsal}</td>
                <td>{r.tokoTujuan}</td>
                <td>{r.brand}</td>
                <td>{r.barang}</td>
                <td className="text-xs">{r.imei}</td>
                <td className="text-center">{r.qty}</td>
                <td>
                  <span
                    className={`px-2 py-1 text-xs rounded-full
                    ${
                      r.status === "Approved"
                        ? "bg-green-100 text-green-700"
                        : r.status === "Pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>

                {/* CETAK */}
                <td className="text-center">
                <button
                        onClick={() => {
                          // PRIORITAS:
                          // 1. Jika sudah Approved → pakai suratJalanId
                          // 2. Jika belum Approved → pakai transfer.id (antisipasi cetak ulang)
                          const sjId = r.suratJalanId || r.id;

                          navigate(`/surat-jalan/${sjId}`);
                        }}
                        className="
        w-full flex items-center justify-center gap-2
        px-3 py-2 rounded-xl
        text-xs font-bold text-white
        bg-gradient-to-r from-indigo-500 to-purple-600
        hover:scale-105 transition
      "
                        title="Cetak ulang Surat Jalan (Superadmin)"
                      >
                        <FaPrint /> PRINT SURAT JALAN
                      </button>
                </td>
              </tr>
            ))}

            {!current.length && (
              <tr>
                <td colSpan={12} className="text-center py-4 text-gray-400">
                  Tidak ada data transfer
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-center gap-2 mt-4">
        {[...Array(totalPage)].map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={`px-3 py-1 rounded ${
              page === i + 1 ? "bg-indigo-600 text-white" : "bg-gray-200"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
