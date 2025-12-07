// src/pages/TransferBarang.jsx — FINAL OTOMATIS + SUPERADMIN APPROVE + VOID + PAGINATION ✅

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaExchangeAlt,
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
import FirebaseService from "../services/FirebaseService";
import { useLocation } from "react-router-dom";

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

export default function TransferBarang() {
  const TOKO_LOGIN = localStorage.getItem("TOKO_LOGIN") || "CILANGKAP PUSAT";

  // ===================== FORM =====================
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    noDo: generateNoDO(),
    noSuratJalan: generateNoSuratJalan(),
    dari: TOKO_LOGIN,
    ke: "",
    tokoPengirim: TOKO_LOGIN, // ✅ BARU
    pengirim: "",
    kategori: "",
    brand: "",
    barang: "",
    imeis: [],
    qty: 0,
  });

  const [imeiInput, setImeiInput] = useState("");
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // ===================== DATA REALTIME =====================
  const [history, setHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [notif, setNotif] = useState(null);
  const [currentRole, setCurrentRole] = useState("USER");
  const [masterBarang, setMasterBarang] = useState([]);
  const [allTransaksi, setAllTransaksi] = useState([]);
  const normalizeRole = (r) => String(r || "").toUpperCase();
  const [stockRealtime, setStockRealtime] = useState({});

  const [selectedSJ, setSelectedSJ] = useState(null);
  const suratJalanRef = useRef(null);

  // ===================== FILTER =====================
  const [filterStatus, setFilterStatus] = useState("ALL");

  // ===================== PAGINATION =====================
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    const unsubUsers = FirebaseService.listenUsers((list) => {
      const arr = Array.isArray(list) ? list : [];
      setUsers(arr);

      // ✅ JANGAN PERCAYA ROLE DARI LOCALSTORAGE
      const localUser = JSON.parse(localStorage.getItem("user") || "{}");
      const username = localUser.username || "";

      const me = arr.find(
        (u) =>
          String(u.username).toLowerCase() === String(username).toLowerCase()
      );

      if (me?.role) {
        setCurrentRole(me.role.toUpperCase()); // ✅ SUPERADMIN REAL
      } else {
        setCurrentRole("USER");
      }
    });

    const unsubTransaksi = FirebaseService.listenAllTransaksi(setAllTransaksi);
    const unsubTransfer = FirebaseService.listenTransferRequests(setHistory);
    const unsubStock = FirebaseService.listenStockAll((s) => {
      setStockRealtime(s || {});
    });

    return () => {
      unsubUsers && unsubUsers();
      unsubTransaksi && unsubTransaksi();
      unsubTransfer && unsubTransfer();
      unsubStock && unsubStock();
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
    const fromTransaksi = (allTransaksi || [])
      .filter((t) => String(t.NAMA_BARANG) === String(form.barang))
      .map((t) => String(t.IMEI || "").trim())
      .filter(Boolean);

    const fromStock = Object.values(stockRealtime?.[form.dari] || {}).map((v) =>
      String(v.imei || "").trim()
    );

    return Array.from(new Set([...fromTransaksi, ...fromStock]));
  }, [allTransaksi, stockRealtime, form.barang, form.dari]);

  // ===================== ADD IMEI =====================
  const addImei = () => {
    const im = imeiInput.trim();
    if (!im) return;
    if (form.imeis.includes(im)) {
      alert("❌ IMEI tidak boleh duplikat!");
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
    setLoading(true);
    try {
      if (!form.ke || !form.pengirim || !form.brand || !form.barang)
        throw new Error("Lengkapi semua field!");
      if (!form.imeis.length) throw new Error("Minimal 1 IMEI!");

      const sku = `${form.brand}_${form.barang}`.replace(/\s+/g, "_");

      await FirebaseService.createTransferRequest({
        ...form,
        sku,
        status: "Pending",
        createdAt: new Date().toISOString(),
      });

      alert("✅ Transfer dikirim & menunggu APPROVE");

      setForm({
        tanggal: new Date().toISOString().slice(0, 10),
        noDo: generateNoDO(),
        noSuratJalan: generateNoSuratJalan(),
        dari: TOKO_LOGIN,
        ke: "",
        tokoPengirim: TOKO_LOGIN,
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

  useEffect(() => {
    if (location?.state?.fromInventory) {
      const inv = location.state;

      setForm((f) => ({
        ...f,
        tanggal: inv.tanggal || f.tanggal,
        dari: inv.dari || f.dari,
        tokoPengirim: inv.dari || f.tokoPengirim,
        brand: inv.brand || "",
        barang: inv.barang || "",
        kategori: inv.kategori || "",
        imeis: inv.imei ? [inv.imei] : [],
        qty: inv.qty ? Number(inv.qty) : 1,
      }));

      setImeiInput("");
    }
  }, [location]);

  // ===================== ✅ APPROVE (SUPERADMIN ONLY) =====================
  const approveTransfer = async (row) => {
    try {
      const username = localStorage.getItem("USERNAME");

      if (currentRole !== "SUPERADMIN") {
        setNotif("❌ Akses ditolak! Anda bukan SUPERADMIN!");
        return;
      }

      // ✅ VALIDASI LANGSUNG KE FIREBASE (BUKAN DARI STATE)

      if (currentRole !== "SUPERADMIN") {
        setNotif("❌ Akses ditolak! Anda bukan SUPERADMIN!");
        return;
      }

      if (!row || row.status !== "Pending") {
        setNotif("⚠️ Transfer ini sudah diproses!");
        return;
      }

      const realFromToko = row.tokoPengirim || row.dari;
      const realQty = Array.isArray(row.imeis)
        ? row.imeis.length
        : Number(row.qty || 0);

      const realSKU = row.sku; // ✅ JANGAN DITAMBAH 128GB

      const realStock = Number(
        stockRealtime?.[realFromToko]?.[row.sku]?.qty || 0
      );
      
      if (realStock < realQty) {
        setNotif(
          `❌ Gagal APPROVE: Stok di ${realFromToko} tidak mencukupi! (Stok tersedia: ${realStock})`
        );
        return;
      }
      const totalStock = await FirebaseService.getStockTotalBySKU(
        realFromToko,
        row.sku
      );

      if (Number(totalStock) < Number(realQty)) {
        setNotif(
          `❌ Gagal APPROVE: Stok di ${realFromToko} tidak mencukupi! (Stok tersedia: ${totalStock})`
        );
        return;
      }

      // ✅ PAKAI SKU PERSIS row.sku (tanpa /128GB, biar sama dengan MasterPembelian & StockOpname)
      await FirebaseService.transferStock({
        fromToko: realFromToko,
        toToko: row.ke,
        sku: row.sku,
        qty: realQty,
        nama: row.barang,
        imei: (row.imeis || []).join(", "),
        keterangan: `SJ:${row.noSuratJalan}`,
        performedBy: username,
      });

      // ✅ CATAT PEMBELIAN JIKA MASUK PUSAT
      if (row.ke === "CILANGKAP PUSAT") {
        for (const im of row.imeis || []) {
          await FirebaseService.addTransaksi(1, {
            TANGGAL_TRANSAKSI: row.tanggal,
            NO_INVOICE: row.noDo,
            NAMA_TOKO: row.ke,
            NAMA_USER: row.pengirim,
            NAMA_BRAND: row.brand,
            KATEGORI_BRAND: row.kategori,
            NAMA_BARANG: row.barang,
            IMEI: im,
            QTY: 1,
            PAYMENT_METODE: "PEMBELIAN",
            STATUS: "Approved",
            KETERANGAN: "TRANSFER MASUK",
          });
        }
      }

      // ✅ UPDATE STATUS DI FIREBASE REALTIME
      await FirebaseService.updateTransferRequest(row.id, {
        status: "Approved",
        approvedBy: username,
        approvedAt: new Date().toISOString(),
      });

      // ✅ NOTIFIKASI DARI STATE (BUKAN ALERT)
      setNotif("✅ Transfer BERHASIL di-APPROVE oleh SUPERADMIN!");
    } catch (err) {
      console.error(err);
      setNotif("❌ Gagal APPROVE: " + err.message);
    }
  };

  const rejectTransfer = async (id) => {
    try {
      const username = localStorage.getItem("USERNAME");

      if (currentRole !== "SUPERADMIN") {
        setNotif("❌ Hanya SUPERADMIN yang boleh menolak transfer!");
        return;
      }

      await FirebaseService.updateTransferRequest(id, {
        status: "Rejected",
        rejectedBy: username,
        rejectedAt: new Date().toISOString(),
      });

      setNotif("✅ Transfer berhasil DITOLAK!");
    } catch (err) {
      setNotif("❌ Gagal reject: " + err.message);
    }
  };

  // ===================== ✅ VOID (BALIKKAN STOCK) =====================
  const voidTransfer = async (row) => {
    if (normalizeRole(currentRole) !== "SUPERADMIN")
      return alert("❌ Hanya SUPERADMIN yang boleh VOID!");

    await FirebaseService.transferStock({
      fromToko: row.ke,
      toToko: row.tokoPengirim || row.dari,
      sku: row.sku,
      qty: row.qty,
      nama: row.barang,
      imei: (row.imeis || []).join(", "),
      keterangan: "VOID TRANSFER",
      performedBy: "SYSTEM",
    });

    await FirebaseService.updateTransferRequest(row.id, {
      status: "Voided",
    });

    alert("✅ Transfer di-VOID & stok dikembalikan!");
  };

  // ===================== FILTER =====================
  const filteredHistory =
    filterStatus === "ALL"
      ? history
      : history.filter((h) => h.status === filterStatus);

  // ===================== PAGINATION DATA =====================
  const pagedHistory = filteredHistory.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );
  const totalPages = Math.ceil(filteredHistory.length / PER_PAGE) || 1;

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

  // ===================== PRINT =====================
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
        <h2 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
          <FaExchangeAlt /> TRANSFER BARANG
        </h2>
        <div className="text-xs text-red-600 font-bold">
          DEBUG ROLE: {currentRole}
        </div>
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

          {/* TOKO TUJUAN */}
          <select
            className="input"
            value={form.ke}
            onChange={(e) => setForm({ ...form, ke: e.target.value })}
          >
            <option value="">Toko Tujuan</option>
            {TOKO_TUJUAN.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

          {/* ✅ TOKO PENGIRIM */}
          <input
            list="toko-list"
            value={form.tokoPengirim}
            onChange={(e) => setForm({ ...form, tokoPengirim: e.target.value })}
            className="input"
            placeholder="Toko Pengirim"
          />
          <datalist id="toko-list">
            {TOKO_TUJUAN.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>

          {/* NAMA PENGIRIM */}
          <input
            list="pengirim-list"
            value={form.pengirim}
            onChange={(e) => setForm({ ...form, pengirim: e.target.value })}
            className="input"
            placeholder="Nama Pengirim"
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
          <div className="flex gap-2 mt-3">
            <input
              list="imei-list"
              value={imeiInput}
              onChange={(e) => setImeiInput(e.target.value)}
              className="input w-full"
            />
            <button
              onClick={addImei}
              className="bg-indigo-600 text-white px-4 rounded-lg"
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
        <button
          onClick={submitTransfer}
          disabled={loading}
          className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-2 rounded-xl shadow"
          type="button"
        >
          {loading ? "Loading..." : "SUBMIT TRANSFER"}
        </button>
      </div>

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
        <button onClick={printSuratJalan} className="btn-indigo" type="button">
          <FaPrint /> Print
        </button>
      </div>

      {notif && (
        <div className="bg-indigo-100 text-indigo-800 p-3 rounded mb-3 font-semibold">
          {notif}
        </div>
      )}

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
          {pagedHistory.map((row) => (
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
                    <button onClick={() => approveTransfer(row)}>
                      <FaCheck />
                    </button>
                    <button onClick={() => rejectTransfer(row.id)}>
                      <FaTimes />
                    </button>
                  </>
                )}
                {row.status === "Approved" && (
                  <button onClick={() => voidTransfer(row)}>VOID</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ✅ PAGINATION */}
      <div className="flex gap-4 justify-center">
        <button onClick={() => setPage(Math.max(1, page - 1))}>Prev</button>
        <span>
          {page} / {totalPages}
        </span>
        <button onClick={() => setPage(Math.min(totalPages, page + 1))}>
          Next
        </button>
      </div>

      {/* ================= SURAT JALAN ================= */}
      {selectedSJ && (
        <div ref={suratJalanRef} className="bg-white p-4 rounded shadow mt-4">
          <h3 className="font-bold">SURAT JALAN</h3>
          <p>No SJ: {selectedSJ.noSuratJalan}</p>
          <p>Dari: {selectedSJ.tokoPengirim}</p>
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
  );
}

// ===================== STYLE HELPER =====================
const styles = document.createElement("style");
styles.innerHTML = `
.input{
  width:100%;
  padding:10px;
  border:1px solid #cbd5e1;
  border-radius:10px;
  transition:all .2s ease;
}
.input:focus{
  outline:none;
  border-color:#4f46e5;
  box-shadow:0 0 0 2px rgba(79,70,229,.2);
}

.btn-blue{
  background:linear-gradient(135deg,#2563eb,#1d4ed8);
  color:white;
  padding:8px 16px;
  border-radius:10px;
  font-weight:600;
}

.btn-red{
  background:linear-gradient(135deg,#dc2626,#991b1b);
  color:white;
  padding:8px 16px;
  border-radius:10px;
  font-weight:600;
}

.btn-indigo{
  background:linear-gradient(135deg,#4f46e5,#4338ca);
  color:white;
  padding:8px 16px;
  border-radius:10px;
  font-weight:600;
}

table{
  border-radius:12px;
  overflow:hidden;
}

thead{
  background:linear-gradient(135deg,#e0e7ff,#c7d2fe);
}

tr:hover{
  background:#eef2ff;
  transition:.15s;
}
`;
document.head.appendChild(styles);
