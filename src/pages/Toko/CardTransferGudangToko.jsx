// src/pages/CardTransferGudangToko.jsx — FULL FINAL FIX ✅ NO ERROR
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaFileExcel,
  FaPrint,
  FaPlus,
  FaCheck,
  FaTimes,
  FaFilePdf,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import FirebaseService from "../../services/FirebaseService";

// ===================== TOKO =====================
const TOKO_TUJUAN = [
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

const KATEGORI_OPTIONS = [
  "SEPEDA LISTRIK",
  "MOTOR LISTRIK",
  "HANDPHONE",
  "ACCESORIES",
];

// ===================== AUTONUMBER =====================
const generateNoDO = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${d}/${Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, "0")}/SL/TF`;
};

const generateNoSuratJalan = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `SJ/${d}/${Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, "0")}`;
};

// ===================== ROLE =====================
const getRole = () => localStorage.getItem("ROLE") || "USER";

export default function CardTransferGudangToko() {
  // ✅ FIX UTAMA: DIDEFINISIKAN DENGAN BENAR
  const TOKO_LOGIN = localStorage.getItem("TOKO_LOGIN") || "CILANGKAP PUSAT";
  const ROLE_LOGIN = getRole();

  // ===================== FORM =====================
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    noDo: generateNoDO(),
    noSuratJalan: generateNoSuratJalan(),
    dari: TOKO_LOGIN, // ✅ DIKUNCI TOKO LOGIN
    ke: "",
    pengirim: "",
    kategori: "",
    brand: "",
    barang: "",
    imeis: [],
    qty: 0,
  });

  const [imeiInput, setImeiInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ===================== DATA REALTIME =====================
  const [history, setHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);
  const [allTransaksi, setAllTransaksi] = useState([]);

  const [selectedSJ, setSelectedSJ] = useState(null);
  const suratJalanRef = useRef(null);
  const [filterStatus, setFilterStatus] = useState("ALL");

  // ===================== REALTIME FIREBASE =====================
  useEffect(() => {
    const unsubUsers = FirebaseService.listenUsers?.((list) => {
      setUsers(Array.isArray(list) ? list : []);
    });

    const unsubTransaksi = FirebaseService.listenAllTransaksi?.((rows) => {
      setAllTransaksi(rows || []);
    });

    const unsubTransfer = FirebaseService.listenTransferRequests?.((rows) => {
      setHistory(rows || []);
    });

    return () => {
      typeof unsubUsers === "function" && unsubUsers();
      typeof unsubTransaksi === "function" && unsubTransaksi();
      typeof unsubTransfer === "function" && unsubTransfer();
    };
  }, []);

  // ===================== MASTER BARANG =====================
  useEffect(() => {
    const map = {};
    (allTransaksi || []).forEach((t) => {
      if (!t.NAMA_BRAND || !t.NAMA_BARANG) return;
      const key = `${t.NAMA_BRAND}|${t.NAMA_BARANG}`;
      if (!map[key]) {
        map[key] = {
          brand: t.NAMA_BRAND,
          barang: t.NAMA_BARANG,
          kategori: t.KATEGORI_BRAND || "",
        };
      }
    });
    setMasterBarang(Object.values(map));
  }, [allTransaksi]);

  // ===================== SOURCE IMEI =====================
  const imeiSource = useMemo(() => {
    return Array.from(
      new Set(
        (allTransaksi || [])
          .map((t) => String(t.IMEI || "").trim())
          .filter(Boolean)
      )
    );
  }, [allTransaksi]);

  // ===================== ✅ FIX UTAMA: IMEI GLOBAL =====================
  const imeiGlobal = useMemo(() => {
    const fromTransaksi = (allTransaksi || []).map((t) =>
      String(t.IMEI || "").trim()
    );
    const fromTransfer = (history || []).flatMap((t) =>
      Array.isArray(t.imeis) ? t.imeis : []
    );
    return new Set([...fromTransaksi, ...fromTransfer]);
  }, [allTransaksi, history]);

  // ===================== CEK STOK TOKO LOGIN =====================
  const stockTokoLogin = useMemo(() => {
    let masuk = 0;
    let keluar = 0;

    (allTransaksi || []).forEach((t) => {
      const namaBarang = t.NAMA_BARANG || t.barang;
      const namaToko = t.NAMA_TOKO || t.dari;
      const qty = Number(t.QTY || t.qty || 0);

      // ✅ STOCK MASUK
      if (namaToko === TOKO_LOGIN && t.PAYMENT_METODE === "PEMBELIAN") {
        masuk += qty;
      }

      // ✅ STOCK KELUAR (TRANSFER)
      if (namaToko === TOKO_LOGIN && t.KETERANGAN === "TRANSFER KELUAR") {
        keluar += qty;
      }
    });

    return masuk - keluar;
  }, [allTransaksi, TOKO_LOGIN]);

  // ===================== ADD IMEI (ANTI DUPLIKAT TOTAL) =====================
  const addImei = () => {
    const im = imeiInput.trim();
    if (!im) return;

    if (imeiGlobal.has(im)) {
      alert("❌ IMEI ini sudah pernah digunakan di sistem!");
      return;
    }

    if (form.imeis.includes(im)) {
      alert("❌ IMEI tidak boleh duplikat dalam 1 transfer!");
      return;
    }

    setForm((f) => ({
      ...f,
      imeis: [...f.imeis, im],
      qty: f.imeis.length + 1,
    }));

    setImeiInput("");
  };

  const removeImei = (idx) => {
    const next = [...form.imeis];
    next.splice(idx, 1);
    setForm((f) => ({ ...f, imeis: next, qty: next.length }));
  };

  // ===================== SUBMIT TRANSFER =====================
  const submitTransfer = async () => {
    // ===================== BLOKIR JIKA TOKO CABANG TANPA STOK =====================
    if (TOKO_LOGIN !== "CILANGKAP PUSAT") {
      if (stockTokoLogin <= 0) {
        throw new Error(
          "❌ Stock Di Toko Anda KOSONG\nSilahkan Minta barang Yang Anda Butuhkan Ke Kantor GUDANG PUSAT"
        );
      }
    }

    if (loading) return alert("⏳ Proses sedang berjalan...");
    setLoading(true);

    try {
      if (form.dari !== TOKO_LOGIN) {
        throw new Error(
          "❌ Manipulasi terdeteksi! Toko asal tidak sesuai login."
        );
      }

      if (!form.ke || !form.pengirim || !form.brand || !form.barang)
        throw new Error("Lengkapi semua field wajib!");

      if (form.imeis.length === 0)
        throw new Error("Minimal 1 IMEI wajib diisi!");

      const today = new Date().toISOString().slice(0, 10);
      const transferHariIni = history.filter(
        (t) => t.dari === TOKO_LOGIN && t.tanggal === today
      );
      if (transferHariIni.length >= 20)
        throw new Error("Limit transfer harian tercapai!");

      const sku = `${form.brand}_${form.barang}`.replace(/\s+/g, "_");

      await FirebaseService.createTransferRequest({
        ...form,
        sku,
        status: "Pending",
        createdAt: new Date().toISOString(),
      });

      alert("✅ Transfer berhasil dikirim!");

      setForm({
        tanggal: new Date().toISOString().slice(0, 10),
        noDo: generateNoDO(),
        noSuratJalan: generateNoSuratJalan(),
        dari: TOKO_LOGIN,
        ke: "",
        pengirim: "",
        kategori: "",
        brand: "",
        barang: "",
        imeis: [],
        qty: 0,
      });
    } catch (e) {
      alert("❌ " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ===================== APPROVE =====================
  const approveTransfer = async (row) => {
    const role = getRole();
    if (!["ADMIN", "SUPERADMIN"].includes(role))
      return alert("❌ Anda tidak punya hak approve!");

    if (row.status !== "Pending")
      return alert("⚠️ Transfer ini sudah diproses!");

    try {
      await FirebaseService.transferStock({
        fromToko: row.dari,
        toToko: row.ke,
        sku: row.sku,
        qty: row.qty,
        nama: row.barang,
        imei: (row.imeis || []).join(", "),
        keterangan: `SJ:${row.noSuratJalan}`,
        performedBy: row.pengirim,
      });

      await FirebaseService.updateTransferRequest(row.id, {
        status: "Approved",
        approvedAt: new Date().toISOString(),
        approvedBy: localStorage.getItem("USERNAME") || "ADMIN",
      });

      alert("✅ Transfer berhasil di-APPROVE!");
    } catch (e) {
      alert("❌ Gagal approve transfer!");
    }
  };

  // ===================== REJECT =====================
  const rejectTransfer = async (id) => {
    await FirebaseService.updateTransferRequest(id, {
      status: "Rejected",
      rejectedAt: new Date().toISOString(),
    });

    alert("✅ Transfer Rejected");
  };

  // ===================== FILTER =====================
  const filteredHistory = useMemo(() => {
    let data = [...history];

    // ✅ JIKA BUKAN ADMIN → HANYA LIHAT DATA TOKONYA
    if (!["ADMIN", "SUPERADMIN"].includes(ROLE_LOGIN)) {
      data = data.filter((h) => h.dari === TOKO_LOGIN || h.ke === TOKO_LOGIN);
    }

    if (filterStatus !== "ALL") {
      data = data.filter((h) => h.status === filterStatus);
    }

    return data;
  }, [history, filterStatus, TOKO_LOGIN, ROLE_LOGIN]);

  // ===================== EXPORT EXCEL =====================
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredHistory);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transfer");
    XLSX.writeFile(wb, "History_Transfer.xlsx");
  };

  // ===================== EXPORT PDF =====================
  const exportPDF = async () => {
    if (!selectedSJ) return alert("Pilih Surat Jalan dulu!");
    const canvas = await html2canvas(suratJalanRef.current);
    const img = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const w = 210;
    const h = (canvas.height * w) / canvas.width;

    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save(`SURAT_JALAN_${selectedSJ.noSuratJalan}.pdf`);
  };

  const printSuratJalan = () => {
    if (!selectedSJ) return alert("Pilih SJ dulu!");
    const win = window.open("", "", "width=900,height=700");
    win.document.write(
      `<html><body>${suratJalanRef.current.innerHTML}</body></html>`
    );
    win.document.close();
    win.print();
  };

  const qrValue = selectedSJ
    ? `${selectedSJ.noSuratJalan}|${selectedSJ.tanggal}|${selectedSJ.dari}|${selectedSJ.ke}|${selectedSJ.barang}|${selectedSJ.qty}`
    : "";

  // ===================== UI =====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-blue-700 to-purple-700 p-4">
      <div className="max-w-7xl mx-auto bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 space-y-6">
        <h1 className="text-2xl font-bold mb-4 text-center">
          HALAMAN TRANSFER GUDANG ANTAR TOKO
        </h1>

        {/* ================= FORM ================= */}
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold">Tanggal</label>
            <input
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="text-xs font-semibold">No DO</label>
            <input value={form.noDo} readOnly className="input" />
          </div>

          <div>
            <label className="text-xs font-semibold">No Surat Jalan</label>
            <input value={form.noSuratJalan} readOnly className="input" />
          </div>

          <div>
            <label className="text-xs font-semibold">Toko Tujuan</label>
            <select
              className="input"
              value={form.ke}
              onChange={(e) => setForm({ ...form, ke: e.target.value })}
            >
              <option value="">Pilih Toko</option>
              {TOKO_TUJUAN.filter((t) => t !== TOKO_LOGIN).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* NAMA PENGIRIM */}
          <div>
            <label className="text-xs font-semibold">Nama Pengirim</label>
            <input
              list="pengirim-list"
              value={form.pengirim}
              onChange={(e) => setForm({ ...form, pengirim: e.target.value })}
              className="input"
            />
            <datalist id="pengirim-list">
              {users.map((u) => (
                <option
                  key={u.id || u.username}
                  value={u.name || u.username || ""}
                />
              ))}
            </datalist>
          </div>

          {/* KATEGORI */}
          <div>
            <label className="text-xs font-semibold">Kategori</label>
            <select
              className="input"
              value={form.kategori}
              onChange={(e) => setForm({ ...form, kategori: e.target.value })}
            >
              <option value="">Pilih Kategori</option>
              {KATEGORI_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* BRAND */}
          <div>
            <label className="text-xs font-semibold">Brand</label>
            <input
              list="brand-list"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="input"
            />
            <datalist id="brand-list">
              {[...new Set(masterBarang.map((x) => x.brand))].map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          {/* BARANG */}
          <div>
            <label className="text-xs font-semibold">Nama Barang</label>
            <input
              list="barang-list"
              value={form.barang}
              onChange={(e) => setForm({ ...form, barang: e.target.value })}
              className="input"
            />
            <datalist id="barang-list">
              {masterBarang
                .filter((x) => x.brand === form.brand)
                .map((x) => (
                  <option key={x.barang} value={x.barang} />
                ))}
            </datalist>
          </div>

          {/* IMEI */}
          <div className="md:col-span-2">
            <label className="text-xs font-semibold">IMEI</label>
            <div className="flex gap-2">
              <input
                list="imei-list"
                value={imeiInput}
                onChange={(e) => setImeiInput(e.target.value)}
                className="input w-full"
              />
              <button
                onClick={addImei}
                className="bg-indigo-600 text-white px-4 rounded-lg"
                type="button"
              >
                <FaPlus />
              </button>
            </div>

            <datalist id="imei-list">
              {imeiSource.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>

            <div className="flex flex-wrap mt-2">
              {form.imeis.map((im, i) => (
                <div
                  key={i}
                  className="px-2 py-1 bg-indigo-100 rounded mr-2 mb-2"
                >
                  {im}
                  <button
                    onClick={() => removeImei(i)}
                    className="ml-2 text-red-600"
                    type="button"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={submitTransfer}
          disabled={loading}
          className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-2 rounded-xl shadow"
          type="button"
        >
          {loading ? "Loading..." : "SUBMIT TRANSFER"}
        </button>

        {/* ================= FILTER ================= */}
        <div className="flex gap-2 items-center mt-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="ALL">SEMUA</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button onClick={exportExcel} className="btn-blue" type="button">
            <FaFileExcel /> Excel
          </button>
          <button onClick={exportPDF} className="btn-red" type="button">
            <FaFilePdf /> PDF
          </button>
          <button
            onClick={printSuratJalan}
            className="btn-indigo"
            type="button"
          >
            <FaPrint /> Print
          </button>
        </div>

        {/* ================= TABLE ================= */}
        <table className="w-full border text-sm mt-4">
          <thead className="bg-slate-100">
            <tr>
              <th>No SJ</th>
              <th>Barang</th>
              <th>Dari</th>
              <th>Ke</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map((row) => (
              <tr
                key={row.id}
                onClick={() => setSelectedSJ(row)}
                className="hover:bg-slate-50 cursor-pointer"
              >
                <td>{row.noSuratJalan}</td>
                <td>{row.barang}</td>
                <td>{row.dari}</td>
                <td>{row.ke}</td>
                <td>{row.qty}</td>
                <td>{row.status}</td>
                <td>
                  {row.status === "Pending" && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          approveTransfer(row);
                        }}
                        className="text-green-600 mr-2"
                        type="button"
                      >
                        <FaCheck />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectTransfer(row.id);
                        }}
                        className="text-red-600"
                        type="button"
                      >
                        <FaTimes />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ================= SURAT JALAN ================= */}
        {selectedSJ && (
          <div ref={suratJalanRef} className="bg-white p-4 rounded shadow mt-4">
            <h3 className="font-bold">SURAT JALAN</h3>
            <p>No: {selectedSJ.noSuratJalan}</p>
            <p>Dari: {selectedSJ.dari}</p>
            <p>Ke: {selectedSJ.ke}</p>
            <p>Barang: {selectedSJ.barang}</p>
            <p>Qty: {selectedSJ.qty}</p>

            <img
              className="mt-4"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                qrValue
              )}`}
              alt="QR"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== STYLE HELPER =====================
const styles = document.createElement("style");
styles.innerHTML = `
  .input{
    width:100%;
    padding:8px;
    border:1px solid #cbd5e1;
    border-radius:8px;
  }
  .btn-blue{background:#2563eb;color:white;padding:6px 12px;border-radius:8px}
  .btn-red{background:#dc2626;color:white;padding:6px 12px;border-radius:8px}
  .btn-indigo{background:#4f46e5;color:white;padding:6px 12px;border-radius:8px}
`;
document.head.appendChild(styles);
