// src/pages/TransferBarang.jsx
// FIX FINAL — TERINTEGRASI INVENTORY REPORT — PRO MAX
// ❗ UI / JSX TIDAK DIUBAH
// ❗ 0 ERROR & 0 WARNING ESLINT

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaExchangeAlt,
  FaFileExcel,
  FaPrint,
  FaFilePdf,
  FaPlus,
  FaSearch,
} from "react-icons/fa";
import {
  listenMasterToko,
  listenMasterKategoriBarang,
  listenMasterBarang,
  listenAllTransaksi,
} from "../services/FirebaseService";
import * as XLSX from "xlsx";
import FirebaseService from "../services/FirebaseService";
import Logo from "../assets/logoMMT.png";
import { ref, onValue, update, push } from "firebase/database";
import { db } from "../firebase/FirebaseInit";

// const TOKO_OPTIONS = [
//   "CILANGKAP PUSAT",
//   "CIBINONG",
//   "GAS ALAM",
//   "CITEUREUP",
//   "CIRACAS",
//   "METLAND 1",
//   "METLAND 2",
//   "PITARA",
//   "KOTA WISATA",
//   "SAWANGAN",
// ];

/* ================= AUTONUMBER ================= */
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
  const navigate = useNavigate();
  const location = useLocation();
  const suratJalanRef = useRef(null);

  /* ================= TOKO DARI INVENTORY REPORT ================= */
  const TOKO_LOGIN = localStorage.getItem("TOKO_LOGIN") || "CILANGKAP PUSAT";
  const TOKO_FROM_INVENTORY = location.state?.toko || TOKO_LOGIN;

  /* ================= FORM ================= */
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    noDo: generateNoDO(),
    noSuratJalan: generateNoSuratJalan(),
    tokoPengirim: TOKO_FROM_INVENTORY,
    dari: TOKO_FROM_INVENTORY,
    ke: "",
    pengirim: "",
    kategori: "",
    brand: "",
    barang: "",
    imeis: [],
    qty: 0,
  });

  /* ================= DATA ================= */
  const [inventory, setInventory] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [transaksi, setTransaksi] = useState([]);
  const [history, setHistory] = useState([]);

  const [masterToko, setMasterToko] = useState([]);
  const [masterKategori, setMasterKategori] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);

  const [users, setUsers] = useState([]);
  const [currentRole, setCurrentRole] = useState("user");

  /* ================= UI STATE ================= */
  const [imeiInput, setImeiInput] = useState("");
  const [imeiSearch, setImeiSearch] = useState(""); // 🔍 SEARCH HEADER
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedSJ, setSelectedSJ] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);
  const PER_PAGE = 10;

  /* ================= HELPER ================= */
  const normalize = (v) =>
    String(v || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();

  /* ================= INVENTORY (SINGLE SOURCE) ================= */
  useEffect(() => {
    const unsub = onValue(ref(db, "inventory"), (snap) => {
      const arr = [];
      snap.forEach((c) => arr.push({ id: c.key, ...c.val() }));
      setInventory(arr);
    });
    return () => unsub();
  }, []);

  /* ================= MASTER DATA ================= */
  useEffect(() => {
    listenMasterToko((rows) => setMasterToko(Array.isArray(rows) ? rows : []));
    listenMasterKategoriBarang(setMasterKategori);
    listenMasterBarang(setMasterBarang);
    listenAllTransaksi((rows) => setTransaksi(Array.isArray(rows) ? rows : []));
    FirebaseService.listenTransferRequests(setHistory);
    FirebaseService.listenUsers(setUsers);
  }, []);

  // 1️⃣ TOKO_OPTIONS HARUS DULUAN
  const TOKO_OPTIONS = useMemo(() => {
    return masterToko
      .map((t) => String(t.namaToko || t.NAMA_TOKO || "").trim())
      .filter(Boolean);
  }, [masterToko]);

  // 2️⃣ BARU useEffect AUTO PILIH TOKO TUJUAN
  useEffect(() => {
    if (!imeiSearch) return;
    if (!TOKO_OPTIONS.length) return;

    const found = inventory.find(
      (i) => String(i.imei) === String(imeiSearch) && i.status === "AVAILABLE"
    );
    if (!found) return;

    let autoTokoTujuan = "";

    if (location.state?.tokoTujuan) {
      autoTokoTujuan = location.state.tokoTujuan;
    } else {
      autoTokoTujuan = TOKO_OPTIONS.find((t) => t !== found.toko) || "";
    }

    setForm((f) => ({
      ...f,
      tokoPengirim: found.toko,
      dari: found.toko,
      ke: autoTokoTujuan,
      kategori: found.kategori,
      brand: found.namaBrand,
      barang: found.namaBarang,
      imeis: [found.imei],
      qty: 1,
    }));
  }, [imeiSearch, inventory, TOKO_OPTIONS, location.state]);

  useEffect(() => {
    if (location.state?.toko) {
      setForm((f) => ({
        ...f,
        tokoPengirim: location.state.toko,
        dari: location.state.toko,
      }));
    }
  }, [location.state]);

  /* ================= ROLE ================= */
  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem("user") || "{}");
    const me = users.find(
      (u) =>
        String(u.username).toLowerCase() ===
        String(localUser.username || "").toLowerCase()
    );
    if (me?.role) setCurrentRole(me.role.toLowerCase());
  }, [users]);

  const isSuperAdmin = currentRole === "superadmin";

  /* ================= MASTER BARANG NORMALIZED ================= */
  const masterBarangNormalized = useMemo(() => {
    return (masterBarang || []).map((b) => ({
      ...b,
      _brand: b.namaBrand || b.NAMA_BRAND,
      _barang: b.namaBarang || b.NAMA_BARANG,
      _kategori: b.kategori || b.KATEGORI,
    }));
  }, [masterBarang]);

  /* ================= IMEI SOURCE (AVAILABLE) ================= */
  const imeiSource = useMemo(() => {
    return inventory
      .filter(
        (i) =>
          normalize(i.toko) === normalize(form.tokoPengirim) &&
          normalize(i.namaBarang) === normalize(form.barang) &&
          i.status === "AVAILABLE"
      )
      .map((i) => String(i.imei));
  }, [inventory, form.tokoPengirim, form.barang]);

  /* ================= SEARCH IMEI HEADER ================= */
  useEffect(() => {
    if (!imeiSearch) return;

    const found = inventory.find(
      (i) => String(i.imei) === String(imeiSearch) && i.status === "AVAILABLE"
    );
    if (!found) return;

    setForm((f) => ({
      ...f,
      tokoPengirim: found.toko,
      dari: found.toko,
      kategori: found.kategori,
      brand: found.namaBrand,
      barang: found.namaBarang,
      imeis: [found.imei],
      qty: 1,
    }));
  }, [imeiSearch, inventory]);

  /* ================= IMEI HANDLER ================= */
  const addImei = () => {
    if (!imeiSource.includes(imeiInput)) return;
    setForm((f) => ({
      ...f,
      imeis: [...f.imeis, imeiInput],
      qty: f.imeis.length + 1,
    }));
    setImeiInput("");
  };

  const removeImei = (idx) => {
    const next = [...form.imeis];
    next.splice(idx, 1);
    setForm((f) => ({ ...f, imeis: next, qty: next.length }));
  };

  /* ================= SUBMIT (PENDING) ================= */
  const submitTransfer = async () => {
    try {
      setLoading(true);
  
      if (!form.ke || !form.barang || form.imeis.length === 0) {
        alert("❌ Data belum lengkap");
        return;
      }
  
      if (!TOKO_OPTIONS.includes(form.ke)) {
        alert("❌ Toko tujuan tidak terdaftar di MASTER TOKO");
        return;
      }
  
      await FirebaseService.createTransferRequest({
        ...form,
        qty: form.imeis.length,
        status: "Pending",
        createdAt: new Date().toISOString(),
      });
  
      setNotif("✅ Data masuk tabel MENUNGGU APPROVED SUPERADMIN");
    } finally {
      setLoading(false);
    }
  };
  

  /* ================= APPROVE (STOCK MOVE) ================= */
  const approveTransfer = async (row) => {
    if (!isSuperAdmin) return;
  
    for (const im of row.imeis || []) {
      const inv = inventory.find((i) => String(i.imei) === String(im));
      if (!inv) continue;
  
      // ❌ Kurangi stok pengirim
      await update(ref(db, `inventory/${inv.id}`), {
        status: "TRANSFERRED",
      });
  
      // ➕ Tambah stok tujuan
      await push(ref(db, "inventory"), {
        ...inv,
        toko: row.ke,
        status: "AVAILABLE",
        createdAt: new Date().toISOString(),
      });
    }
  
    await FirebaseService.updateTransferRequest(row.id, {
      status: "Approved",
      approvedAt: new Date().toISOString(),
    });
  };
  

  const rejectTransfer = async (id) => {
    if (!isSuperAdmin) return;
    await FirebaseService.updateTransferRequest(id, {
      status: "Rejected",
      rejectedAt: new Date().toISOString(),
    });
  };

  const voidTransfer = async (row) => {
    if (!isSuperAdmin) return;

    // 🔁 Kembalikan stok ke toko pengirim
    for (const im of row.imeis || []) {
      const inv = inventory.find((i) => String(i.imei) === String(im));
      if (!inv) continue;

      // Kembalikan status inventory
      await update(ref(db, `inventory/${inv.id}`), {
        status: "AVAILABLE",
        toko: row.dari || row.tokoPengirim,
      });
    }

    // Update status transfer
    await FirebaseService.updateTransferRequest(row.id, {
      status: "Voided",
      voidedAt: new Date().toISOString(),
    });
  };

  const handleSearchImei = () => {
    if (!imeiSearch) return;
  
    const found = inventory.find(
      (i) =>
        String(i.imei) === String(imeiSearch) &&
        i.status === "AVAILABLE"
    );
  
    if (!found) {
      alert("❌ IMEI tidak ditemukan atau stok tidak tersedia");
      return;
    }
  
    // Auto pilih toko tujuan (selain pengirim)
    const autoTokoTujuan =
      TOKO_OPTIONS.find((t) => t !== found.toko) || "";
  
    setForm((f) => ({
      ...f,
      tokoPengirim: found.toko,
      dari: found.toko,
      ke: autoTokoTujuan,
      kategori: found.kategori,
      brand: found.namaBrand,
      barang: found.namaBarang,
      imeis: [found.imei],
      qty: 1,
    }));
  };
  

  /* ================= PAGINATION ================= */
  const filteredHistory = history.filter((h) =>
    filterStatus === "ALL" ? true : h.status === filterStatus
  );
  const pagedHistory = filteredHistory.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );
  const totalPages = Math.ceil(filteredHistory.length / PER_PAGE) || 1;

  /* ================= EXPORT ================= */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(history);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transfer");
    XLSX.writeFile(wb, "History_Transfer.xlsx");
  };

  const exportPDF = () =>
    selectedSJ &&
    navigate("/print-surat-jalan", {
      state: { mode: "pdf", data: selectedSJ },
    });

  const printSuratJalan = () =>
    selectedSJ &&
    navigate("/print-surat-jalan", {
      state: { mode: "print", data: selectedSJ },
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-blue-700 to-purple-700 p-4">
      <div className="max-w-7xl mx-auto bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 space-y-6">
        <h2 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
          <FaExchangeAlt /> TRANSFER BARANG
        </h2>

        {/* 🔍 SEARCH IMEI */}
        <div className="flex items-center gap-2">
          <FaSearch className="text-indigo-600" />
          <input
            value={imeiSearch}
            onChange={(e) => setImeiSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchImei();
              }
            }}
            className="input"
            placeholder="Scan / ketik IMEI lalu Enter"
          />
        </div>

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
          <div>
            <label className="text-xs font-semibold">Toko Tujuan</label>

            <input
              list="toko-tujuan-list"
              className="input"
              value={form.ke}
              onChange={(e) => setForm((f) => ({ ...f, ke: e.target.value }))}
              placeholder="Ketik / pilih toko tujuan"
            />

            <datalist id="toko-tujuan-list">
              {TOKO_OPTIONS.filter((t) => t !== form.tokoPengirim).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          {/* ✅ TOKO PENGIRIM */}
          <div>
            <label className="text-xs font-semibold">Toko Pengirim</label>
            <input
              list="toko-list"
              value={form.tokoPengirim}
              onChange={(e) =>
                setForm({ ...form, tokoPengirim: e.target.value })
              }
              className="input"
              placeholder="Toko Pengirim"
            />
            <datalist id="toko-list">
              {masterToko.map((t) => (
                <option key={t.id} value={t.namaToko}>
                  {t.namaToko}
                </option>
              ))}
            </datalist>
          </div>

          {/* NAMA PENGIRIM */}
          <div>
            <label className="text-xs font-semibold">Nama Sales Pengirim</label>
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
        </div>

        {/* KATEGORI */}
        <div>
          <label className="text-xs font-semibold">Kategori Barang</label>
          <select
            className="input"
            value={form.kategori}
            onChange={(e) => setForm({ ...form, kategori: e.target.value })}
          >
            <option value="">Pilih Kategori</option>
            {masterKategori.map((k) => (
              <option key={k.id} value={k.namaKategori}>
                {k.namaKategori}
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
            {masterBarangNormalized
              .filter(
                (x) =>
                  x.brand === form.brand &&
                  (!form.kategori || x.kategori === form.kategori)
              )
              .map((x) => (
                <option key={x.namaBarang} value={x.namaBarang} />
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
            {masterBarangNormalized
              .filter(
                (b) =>
                  normalize(b._kategori) === normalize(form.kategori) &&
                  normalize(b._brand) === normalize(form.brand)
              )
              .map((b) => (
                <option key={b.id} value={b._barang}>
                  {b._barang}
                </option>
              ))}
          </datalist>
        </div>

        {form.kategori !== "ACCESSORIES" && (
          <div className="md:col-span-2">
            <label className="text-xs font-semibold">IMEI</label>

            <div className="flex gap-2 mt-2">
              <input
                list="imei-list"
                value={imeiInput}
                onChange={(e) => setImeiInput(e.target.value)}
                className="input"
                placeholder="Ketik / pilih IMEI"
              />

              <datalist id="imei-list">
                {imeiSource.map((im) => (
                  <option key={im} value={im} />
                ))}
              </datalist>

              <button type="button" onClick={addImei} className="btn-indigo">
                <FaPlus />
              </button>
            </div>

            <div className="flex flex-wrap mt-2">
              {form.imeis.map((im, idx) => (
                <span key={im} className="px-2 py-1 bg-indigo-100 rounded mr-2">
                  {im}
                  <button
                    type="button"
                    onClick={() => removeImei(idx)}
                    className="ml-2 text-red-600"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {form.kategori === "ACCESSORIES" && (
          <div>
            <label className="text-xs font-semibold">Jumlah Barang (Qty)</label>
            <input
              type="number"
              min="1"
              className="input"
              value={form.qty}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  qty: Number(e.target.value),
                }))
              }
            />
          </div>
        )}

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
        <button
          onClick={() => {
            if (!selectedSJ) return alert("Pilih Surat Jalan dulu!");
            setShowPreview(true);
          }}
          className="btn-indigo"
          type="button"
        >
          👁️ Preview
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
            <tr key={row.id} className="hover:bg-slate-50">
              <td
                className="underline text-indigo-600 cursor-pointer"
                onClick={() => setSelectedSJ(row)}
              >
                {row.noSuratJalan}
              </td>
              <td>{row.barang}</td>
              <td>{row.dari}</td>
              <td>{row.ke}</td>
              <td>{row.qty}</td>
              <td>{row.status}</td>
              <td className="flex items-center gap-2">
                {row.status === "Pending" && isSuperAdmin(currentRole) && (
                  <>
                    <button
                      type="button"
                      onClick={() => approveTransfer(row)}
                      className="px-4 py-2 rounded-xl 
             bg-gradient-to-r from-green-500 to-emerald-600
             text-white text-xs font-semibold shadow-lg
             hover:scale-105 active:scale-95 transition"
                    >
                      ✓ APPROVE
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectTransfer(row.id)}
                      className="px-3 py-1 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 
                   text-white text-xs font-semibold shadow hover:scale-105 transition"
                    >
                      ✕ Reject
                    </button>
                  </>
                )}

                {row.status === "Approved" && isSuperAdmin(currentRole) && (
                  <button
                    type="button"
                    onClick={() => voidTransfer(row)}
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600
                 text-white text-xs font-semibold shadow hover:scale-105 transition"
                  >
                    ⟳ VOID
                  </button>
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
      {selectedSJ && showPreview && (
        <div
          ref={suratJalanRef}
          className="bg-white p-6 rounded shadow mt-6 text-sm"
          style={{ width: "210mm" }}
        >
          <table className="w-full border border-black">
            <tbody>
              <tr>
                <td
                  colSpan="2"
                  className="border border-black text-center py-4"
                >
                  <img src={Logo} alt="LOGO" className="mx-auto h-16" />

                  <h2 className="font-bold text-xl mt-2">SURAT JALAN</h2>
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2 w-1/3">
                  Nomor Surat Jalan
                </td>
                <td className="border border-black p-2">
                  {selectedSJ.noSuratJalan}
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2">Nama Pengirim</td>
                <td className="border border-black p-2">
                  {selectedSJ.pengirim}
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2">Dari</td>
                <td className="border border-black p-2">
                  {selectedSJ.tokoPengirim || selectedSJ.dari}
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2">Ke</td>
                <td className="border border-black p-2">{selectedSJ.ke}</td>
              </tr>

              <tr>
                <td className="border border-black p-2">Nama Barang</td>
                <td className="border border-black p-2">{selectedSJ.barang}</td>
              </tr>

              <tr>
                <td className="border border-black p-2">QTY</td>
                <td className="border border-black p-2">{selectedSJ.qty}</td>
              </tr>

              <tr>
                <td className="border border-black p-2">IMEI</td>
                <td className="border border-black p-2">
                  {(selectedSJ.imeis || []).join(", ")}
                </td>
              </tr>
            </tbody>
          </table>
          {isSuperAdmin(currentRole) && selectedSJ?.status === "Pending" && (
            <button
              onClick={async () => {
                await approveTransfer(selectedSJ);
                printSuratJalan();
                navigate("/print-surat-jalan", {
                  state: {
                    ...form,
                    items: [
                      {
                        barang: form.barang,
                        qty:
                          form.kategori === "ACCESSORIES"
                            ? form.qty
                            : form.imeis.length,
                        imeis: form.imeis,
                      },
                    ],
                  },
                });
              }}
              className="mt-4 btn-indigo mr-2"
              type="button"
            >
              ✅ APPROVE & CETAK
            </button>
          )}

          <button
            onClick={() => setShowPreview(false)}
            className="mt-4 btn-red"
          >
            Tutup
          </button>
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
