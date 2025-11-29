// src/pages/TransferBarang.jsx — PRO MAX+ with Approval Admin + IMEI Search + Dark/Light Mode
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaExchangeAlt,
  FaSearch,
  FaFileExcel,
  FaInfoCircle,
  FaPrint,
  FaCheck,
  FaTimes,
  FaSun,
  FaMoon,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import FirebaseService from "../services/FirebaseService"; // expects functions documented below

const fallbackTokoNames = [
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

// helper format rupiah
const fmt = (v) => {
  try {
    return Number(v || 0).toLocaleString("id-ID");
  } catch {
    return String(v || "");
  }
};

export default function TransferBarang() {
  const navigate = useNavigate();

  // ================== THEME ==================
  const [isDark, setIsDark] = useState(true);

  // -----------------------
  // app state
  // -----------------------
  const [stockAll, setStockAll] = useState({});
  const [tokoList, setTokoList] = useState(fallbackTokoNames);

  // SEARCH sekarang pakai IMEI
  const [imeiSearch, setImeiSearch] = useState("");
  const [imeiDropdownOpen, setImeiDropdownOpen] = useState(false);

  const [showTokoDropdown, setShowTokoDropdown] = useState(false);

  // form state (sku tetap dipakai backend)
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    dari: "CILANGKAP PUSAT",
    ke: "",
    sku: "",
    brand: "",
    nama: "",
    imei: "",
    noInvoice: "",
    qty: 1,
    harga: "",
    pic: "",
    keterangan: "",
  });

  const [availableQty, setAvailableQty] = useState(0);
  const [targetQty, setTargetQty] = useState(0);
  const [loading, setLoading] = useState(false);

  // session local history for quick review
  const [sessionHistory, setSessionHistory] = useState([]);

  // pending requests (from firebase if available)
  const [pendingRequests, setPendingRequests] = useState([]);

  // admin flag: simple detection from localStorage.user.isAdmin === true
  const [isAdmin, setIsAdmin] = useState(false);

  const tableRef = useRef(null);

  // ------------------------------------------------------------------
  // 1) realtime stock listener
  // ------------------------------------------------------------------
  useEffect(() => {
    if (typeof FirebaseService.listenStockAll === "function") {
      const unsub = FirebaseService.listenStockAll((snap) => {
        setStockAll(snap || {});
      });
      return () => unsub && unsub();
    } else {
      console.warn(
        "FirebaseService.listenStockAll not found — stockAll will be empty"
      );
      setStockAll({});
      return;
    }
  }, []);

  // keep tokoList synchronized with stockAll
  useEffect(() => {
    const keys = Object.keys(stockAll || {});
    const list = keys.length
      ? Array.from(new Set([...keys, ...fallbackTokoNames]))
      : fallbackTokoNames;
    // ensure PUSAT first
    list.sort((a, b) => {
      if (a === "PUSAT") return -1;
      if (b === "PUSAT") return 1;
      return a.localeCompare(b);
    });
    setTokoList(list);
  }, [stockAll]);

  // ---------------------------
  // detect admin from localStorage
  // ---------------------------
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      setIsAdmin(Boolean(u?.isAdmin));
    } catch {
      setIsAdmin(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // 2) IMEI options (berdasarkan MASTER STOCK / MASTER BARANG di toko asal)
  // ------------------------------------------------------------------
  const imeiOptions = useMemo(() => {
    const perToko = stockAll[form.dari] || {};
    let items = Object.entries(perToko || {}).map(([skuKey, it]) => ({
      skuKey,
      imei: String(it.imei || "").trim(),
      nama: it.nama || "",
      brand: it.brand || "",
      harga: it.harga || "",
      noInvoice: it.noInvoice || it.NO_INVOICE || "",
      qty: it.qty || 0,
    }));

    // hanya yang punya IMEI
    items = items.filter((it) => it.imei);

    if (imeiSearch && imeiSearch.trim()) {
      const s = imeiSearch.trim().toLowerCase();
      items = items.filter(
        (it) =>
          it.imei.toLowerCase().includes(s) ||
          it.nama.toLowerCase().includes(s) ||
          it.brand.toLowerCase().includes(s) ||
          it.skuKey.toLowerCase().includes(s)
      );
    }

    return items;
  }, [stockAll, form.dari, imeiSearch]);

  // ------------------------------------------------------------------
  // 3) load stok untuk SKU tertentu di toko asal (pakai form.sku)
  // ------------------------------------------------------------------
  useEffect(() => {
    const { dari, sku } = form;
    if (!dari || !sku) {
      setAvailableQty(0);
      return;
    }

    if (typeof FirebaseService.getStockForToko === "function") {
      FirebaseService.getStockForToko(dari, sku)
        .then((item) => {
          const qty = item?.qty ? Number(item.qty) : 0;
          setAvailableQty(qty);
          if (item) {
            setForm((f) => ({
              ...f,
              brand: f.brand || item.brand || "",
              nama: f.nama || item.nama || "",
              imei: f.imei || item.imei || "",
              harga:
                f.harga !== "" && f.harga !== undefined
                  ? f.harga
                  : item.harga || "",
              noInvoice:
                f.noInvoice ||
                item.noInvoice ||
                item.NO_INVOICE ||
                f.noInvoice ||
                "",
            }));
          }
        })
        .catch(() => setAvailableQty(0));
    } else {
      const it = (stockAll[dari] || {})[sku] || null;
      const qty = it?.qty ? Number(it.qty) : 0;
      setAvailableQty(qty);
      if (it) {
        setForm((f) => ({
          ...f,
          brand: f.brand || it.brand || "",
          nama: f.nama || it.nama || "",
          imei: f.imei || it.imei || "",
          harga:
            f.harga !== "" && f.harga !== undefined ? f.harga : it.harga || "",
          noInvoice:
            f.noInvoice || it.noInvoice || it.NO_INVOICE || f.noInvoice || "",
        }));
      }
    }
  }, [form.dari, form.sku, stockAll]);

  // ------------------------------------------------------------------
  // 4) target qty preview
  // ------------------------------------------------------------------
  useEffect(() => {
    const { ke, sku } = form;
    if (!ke || !sku) {
      setTargetQty(0);
      return;
    }
    const qty = (stockAll[ke] || {})[sku]?.qty || 0;
    setTargetQty(Number(qty));
  }, [form.ke, form.sku, stockAll]);

  // ------------------------------------------------------------------
  // 5) listen pending requests (admin view) — optional
  // ------------------------------------------------------------------
  useEffect(() => {
    if (typeof FirebaseService.listenTransferRequests === "function") {
      const unsub = FirebaseService.listenTransferRequests((list) => {
        setPendingRequests(Array.isArray(list) ? list : list || []);
      });
      return () => unsub && unsub();
    } else {
      setPendingRequests([]);
    }
  }, []);

  // ------------------------------------------------------------------
  // 6) handlers
  // ------------------------------------------------------------------
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const handleImeiSelect = (item) => {
    const perToko = stockAll[form.dari] || {};
    const data = perToko[item.skuKey] || {};
    setForm((f) => ({
      ...f,
      sku: item.skuKey,
      imei: item.imei,
      brand: data.brand || item.brand || f.brand || "",
      nama: data.nama || item.nama || f.nama || "",
      harga:
        f.harga !== "" && f.harga !== undefined
          ? f.harga
          : data.harga || item.harga || "",
      noInvoice:
        f.noInvoice ||
        data.noInvoice ||
        data.NO_INVOICE ||
        item.noInvoice ||
        "",
    }));
    setImeiSearch(item.imei);
    setImeiDropdownOpen(false);
  };

  // create transfer request (for approval)
  const createTransferRequest = async () => {
    const {
      tanggal,
      dari,
      ke,
      sku,
      qty,
      nama,
      brand,
      imei,
      harga,
      pic,
      keterangan,
      noInvoice,
    } = form;

    if (!tanggal || !pic || !harga) {
      alert("Tanggal, Harga, dan PIC wajib diisi!");
      return;
    }
    if (!dari || !ke || !sku) {
      alert("Mohon isi: Dari, Ke, dan pilih IMEI / SKU terlebih dahulu.");
      return;
    }
    if (dari === ke) {
      alert("Toko asal & tujuan tidak boleh sama.");
      return;
    }
    if (!qty || Number(qty) <= 0) {
      alert("Qty harus > 0.");
      return;
    }
    if (availableQty < Number(qty)) {
      alert(`Stok tidak cukup. Tersedia: ${availableQty}`);
      return;
    }

    const performedBy = (() => {
      try {
        const u = JSON.parse(localStorage.getItem("user"));
        return u?.username || u?.name || "system";
      } catch {
        return "system";
      }
    })();

    const payload = {
      tanggal,
      dari,
      ke,
      sku,
      brand,
      nama,
      imei,
      qty: Number(qty),
      harga: Number(harga),
      noInvoice: noInvoice || "",
      pic,
      keterangan,
      status: "Pending",
      createdAt: new Date().toISOString(),
      requestedBy: performedBy,
    };

    setLoading(true);
    try {
      if (typeof FirebaseService.createTransferRequest === "function") {
        await FirebaseService.createTransferRequest(payload);
        alert(
          "Request transfer berhasil dibuat dan menunggu approval admin."
        );
      } else {
        const id = `local-${Date.now()}`;
        const r = { id, ...payload };
        setPendingRequests((p) => [r, ...p]);
        alert(
          "Request transfer dibuat secara lokal (FirebaseService.createTransferRequest tidak tersedia)."
        );
      }

      setSessionHistory((h) =>
        [{ id: `req-${Date.now()}`, ...payload }, ...h].slice(0, 500)
      );
      setForm((f) => ({
        ...f,
        sku: "",
        imei: "",
        brand: "",
        nama: "",
        harga: "",
        noInvoice: "",
        qty: 1,
        pic: "",
        keterangan: "",
      }));
      setImeiSearch("");
    } catch (err) {
      console.error("createTransferRequest error:", err);
      alert("Gagal membuat request transfer. Cek console.");
    } finally {
      setLoading(false);
    }
  };

  // admin: approve request -> perform actual transferStock and mark request approved
  const approveRequest = async (req) => {
    if (
      !window.confirm(
        `Setujui transfer ${req.sku} ${req.qty} dari ${req.dari} ke ${req.ke}?`
      )
    )
      return;
    try {
      if (typeof FirebaseService.transferStock === "function") {
        await FirebaseService.transferStock({
          fromToko: req.dari,
          toToko: req.ke,
          sku: req.sku,
          qty: Number(req.qty),
          nama: req.nama,
          imei: req.imei,
          keterangan: `APPROVED: ${req.keterangan || ""}`,
          performedBy: req.requestedBy || "admin",
        });
      } else {
        throw new Error("FirebaseService.transferStock not implemented");
      }

      if (typeof FirebaseService.updateTransferRequest === "function") {
        await FirebaseService.updateTransferRequest(req.id, {
          status: "Approved",
          approvedAt: new Date().toISOString(),
          approvedBy:
            JSON.parse(localStorage.getItem("user") || "{}").username ||
            "admin",
        });
      } else {
        setPendingRequests((p) => p.filter((x) => x.id !== req.id));
      }

      alert("Transfer disetujui & stok telah dipindahkan.");
    } catch (err) {
      console.error("approveRequest error:", err);
      alert("Gagal approve request. Cek console.");
    }
  };

  // admin: reject request
  const rejectRequest = async (req, reason = "") => {
    if (
      !window.confirm(
        `Tolak request ${req.sku} ${req.qty} dari ${req.dari} ke ${req.ke}?`
      )
    )
      return;
    try {
      if (typeof FirebaseService.updateTransferRequest === "function") {
        await FirebaseService.updateTransferRequest(req.id, {
          status: "Rejected",
          rejectedAt: new Date().toISOString(),
          rejectedBy:
            JSON.parse(localStorage.getItem("user") || "{}").username ||
            "admin",
          rejectReason: reason,
        });
      } else {
        setPendingRequests((p) => p.filter((x) => x.id !== req.id));
      }
      alert("Request ditolak.");
    } catch (err) {
      console.error("rejectRequest error:", err);
      alert("Gagal menolak request.");
    }
  };

  // export session history as excel
  const exportHistoryExcel = () => {
    if (!sessionHistory.length) {
      alert("Belum ada riwayat.");
      return;
    }
    const rows = sessionHistory.map((h, i) => ({
      NO: i + 1,
      TANGGAL: h.tanggal,
      DARI: h.dari,
      KE: h.ke,
      SKU: h.sku,
      BRAND: h.brand,
      NAMA: h.nama,
      IMEI: h.imei,
      QTY: h.qty,
      HARGA: h.harga,
      PIC: h.pic,
      KETERANGAN: h.keterangan,
      STATUS: h.status || "Local",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TransferSession");
    XLSX.writeFile(
      wb,
      `Transfer_Session_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // print PDF for the latest session transfer
  const printLatestSuratJalan = () => {
    if (!sessionHistory.length) {
      alert("Belum ada riwayat untuk dicetak.");
      return;
    }
    const t = sessionHistory[0];
    const doc = new jsPDF("p", "mm", "a4");

    doc.setFontSize(12);
    doc.rect(14, 10, 36, 24); // logo box
    doc.text("LOGO", 32, 26, { align: "center" });

    doc.setFontSize(16);
    doc.text("SURAT JALAN", 105, 18, { align: "center" });
    doc.setFontSize(10);
    doc.text(
      `No : SJ-${t.tanggal.replace(/-/g, "")}-${t.id?.slice(-4) || "0000"}`,
      15,
      40
    );
    doc.text(`Tanggal : ${t.tanggal}`, 15, 46);
    doc.text(`Dari : ${t.dari}`, 15, 52);
    doc.text(`Ke : ${t.ke}`, 15, 58);
    doc.text(`PIC : ${t.pic}`, 15, 64);
    doc.text(
      `Dibuat : ${t.requestedBy || t.performedBy || "system"}`,
      15,
      70
    );

    let y = 80;
    doc.setFontSize(10);
    doc.text("No", 15, y);
    doc.text("SKU/IMEI", 30, y);
    doc.text("Barang", 70, y);
    doc.text("Qty", 150, y);
    y += 6;
    doc.text("1", 15, y);
    doc.text(t.sku || t.imei || "-", 30, y);
    doc.text(t.nama || "-", 70, y);
    doc.text(String(t.qty || 0), 150, y);
    y += 20;
    doc.text(`Keterangan: ${t.keterangan || "-"}`, 15, y);

    doc.save(
      `SuratJalan_${t.tanggal}_${t.dari}_to_${t.ke}.pdf`
    );
  };

  // ================== THEME CLASS ==================
  const rootClass = isDark
    ? "min-h-screen p-4 bg-slate-950 text-slate-100"
    : "min-h-screen p-4 bg-slate-100 text-slate-900";

  const cardClass = isDark
    ? "bg-slate-900 border border-slate-800"
    : "bg-white border border-slate-200";

  const subTextClass = isDark ? "text-slate-400" : "text-slate-500";

  // UI
  return (
    <div className={rootClass}>
      <div
        className={`rounded-xl shadow-md max-w-7xl mx-auto ${
          isDark ? "" : ""
        }`}
      >
        {/* HEADER GRADIENT */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white p-4 rounded-lg mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              Transfer Barang — PRO MAX+ (Approval)
            </h2>
            <p className="text-sm text-indigo-100">
              {isAdmin
                ? "Mode Admin — approve/reject transfer requests"
                : "Buat request transfer, menunggu approval admin"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <FaInfoCircle />
              <span>Realtime sync via Firebase</span>
            </div>
            <button
              onClick={() => setIsDark((p) => !p)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/20 hover:bg-black/30 text-xs border border-white/30"
            >
              {isDark ? <FaSun /> : <FaMoon />}
              <span>{isDark ? "Mode Terang" : "Mode Gelap"}</span>
            </button>
          </div>
        </div>

        {/* FORM + SUMMARY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div
            className={`lg:col-span-2 p-4 rounded shadow ${cardClass}`}
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FaExchangeAlt /> Form Transfer Barang
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">Tanggal</label>
                <input
                  type="date"
                  name="tanggal"
                  value={form.tanggal}
                  onChange={handleChange}
                  className="w-full p-2 border rounded bg-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Dari Toko</label>
                <select
                  name="dari"
                  value={form.dari}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      dari: e.target.value,
                      sku: "",
                      brand: "",
                      nama: "",
                      imei: "",
                      noInvoice: "",
                    }));
                    setImeiSearch("");
                  }}
                  className="w-full p-2 border rounded bg-transparent"
                >
                  {tokoList.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-sm mb-1">
                  Ke Toko (Tujuan)
                </label>
                <input
                  type="text"
                  name="ke"
                  value={form.ke}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, ke: e.target.value }));
                    setShowTokoDropdown(true);
                  }}
                  onFocus={() => setShowTokoDropdown(true)}
                  placeholder="Ketik nama toko..."
                  className="w-full p-2 border rounded bg-transparent"
                />
                {showTokoDropdown && (
                  <div
                    className={`absolute z-20 w-full rounded shadow max-h-40 overflow-y-auto ${
                      isDark ? "bg-slate-900 border border-slate-700" : "bg-white border"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {tokoList
                      .filter((t) => t !== form.dari)
                      .filter((t) =>
                        t
                          .toLowerCase()
                          .includes(form.ke.toLowerCase())
                      )
                      .map((t) => (
                        <div
                          key={t}
                          className={`px-3 py-2 cursor-pointer text-sm ${
                            isDark
                              ? "hover:bg-indigo-900"
                              : "hover:bg-indigo-100"
                          }`}
                          onClick={() => {
                            setForm((f) => ({ ...f, ke: t }));
                            setShowTokoDropdown(false);
                          }}
                        >
                          {t}
                        </div>
                      ))}
                    {form.ke &&
                      !tokoList.some((t) => t === form.ke) && (
                        <div className="px-3 py-2 text-xs italic text-gray-500">
                          Toko baru (manual): {form.ke}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* IMEI SEARCH */}
              <div className="md:col-span-1 relative">
                <label className="block text-sm mb-1">
                  <FaSearch className="inline mr-1" />
                  No IMEI / MESIN
                </label>
                <input
                  value={imeiSearch}
                  onChange={(e) => {
                    setImeiSearch(e.target.value);
                    setImeiDropdownOpen(Boolean(e.target.value));
                  }}
                  onFocus={() => setImeiDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      imeiOptions.length > 0
                    ) {
                      handleImeiSelect(imeiOptions[0]);
                    }
                  }}
                  className="w-full p-2 border rounded bg-transparent"
                  placeholder="Ketik / scan IMEI atau MESIN..."
                />
                {imeiDropdownOpen && (
                  <div
                    className={`absolute z-30 w-full rounded shadow max-h-48 overflow-y-auto mt-1 ${
                      isDark ? "bg-slate-900 border border-slate-700" : "bg-white border"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {imeiOptions.length > 0 ? (
                      imeiOptions.map((item) => (
                        <div
                          key={item.skuKey}
                          onClick={() => handleImeiSelect(item)}
                          className={`px-3 py-2 cursor-pointer text-xs sm:text-sm ${
                            isDark
                              ? "hover:bg-indigo-900"
                              : "hover:bg-indigo-100"
                          }`}
                        >
                          <div className="font-mono">
                            IMEI: {item.imei}
                          </div>
                          <div className="text-xs">
                            {item.brand} — {item.nama}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            SKU: {item.skuKey} | Stok:{" "}
                            {item.qty || 0}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-400 italic">
                        IMEI tidak ditemukan di stok {form.dari}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* NO INVOICE OTOMATIS */}
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">
                  No Invoice (otomatis dari IMEI)
                </label>
                <input
                  name="noInvoice"
                  value={form.noInvoice}
                  onChange={handleChange}
                  className="w-full p-2 border rounded bg-slate-900/10 bg-transparent"
                  placeholder="Otomatis terisi setelah pilih IMEI (jika ada di master)"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Brand</label>
                <input
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  className="w-full p-2 border rounded bg-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Nama Barang</label>
                <input
                  name="nama"
                  value={form.nama}
                  onChange={handleChange}
                  className="w-full p-2 border rounded bg-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  IMEI / Nomor Unik
                </label>
                <input
                  name="imei"
                  value={form.imei}
                  onChange={handleChange}
                  className="w-full p-2 border rounded bg-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Harga Unit (Rp)
                </label>
                <input
                  type="number"
                  name="harga"
                  value={form.harga}
                  onChange={handleChange}
                  className="w-full p-2 border rounded text-right bg-transparent"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Qty Transfer
                </label>
                <input
                  type="number"
                  min={1}
                  name="qty"
                  value={form.qty}
                  onChange={handleChange}
                  className="w-full p-2 border rounded text-right bg-transparent"
                />
                <div className="text-xs text-gray-400 mt-1">
                  Stok tersedia di {form.dari}: {availableQty}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">PIC Pengirim</label>
                <input
                  name="pic"
                  value={form.pic}
                  onChange={handleChange}
                  className="w-full p-2 border rounded bg-transparent"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm mb-1">Keterangan</label>
                <input
                  name="keterangan"
                  value={form.keterangan}
                  onChange={handleChange}
                  className="w-full p-2 border rounded bg-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              {isAdmin ? (
                <button
                  onClick={() => {
                    alert(
                      "Admin dapat approve request di tabel Pending Requests di bawah."
                    );
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded flex items-center text-sm"
                >
                  Buat & Setujui
                </button>
              ) : (
                <button
                  onClick={createTransferRequest}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded flex items-center text-sm"
                >
                  <FaArrowRight className="mr-2" />
                  {loading ? "Memproses..." : "Buat Request"}
                </button>
              )}

              <button
                onClick={() => navigate("/inventory-report")}
                className={`px-4 py-2 rounded text-sm ${
                  isDark
                    ? "border border-slate-600 hover:bg-slate-800"
                    : "border border-slate-300 hover:bg-slate-100"
                }`}
              >
                Kembali
              </button>
            </div>
          </div>

          {/* summary */}
          <div
            className={`p-4 rounded shadow ${cardClass}`}
          >
            <h3 className="font-semibold mb-2">Ringkasan</h3>
            <div className="mb-2 text-xs text-gray-400">IMEI / SKU</div>
            <div className="font-mono mb-3 text-sm">
              {form.imei || form.sku || "-"}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/10 p-2 rounded border border-slate-700/40">
                <div className="text-xs text-gray-400">Dari</div>
                <div className="font-semibold text-sm">
                  {form.dari || "-"}
                </div>
                <div className="text-xs">
                  Sistem:{" "}
                  <span className="font-mono">
                    {availableQty}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-900/10 p-2 rounded border border-emerald-700/40">
                <div className="text-xs text-gray-400">Ke</div>
                <div className="font-semibold text-sm">
                  {form.ke || "-"}
                </div>
                <div className="text-xs">
                  Sistem:{" "}
                  <span className="font-mono">
                    {targetQty}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/10 p-2 rounded border border-slate-700/40 mt-3 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Qty Transfer</span>
                <span>Estimasi</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="font-semibold text-sm">
                  {form.qty || 0} unit
                </span>
                <span className="font-mono text-sm">
                  {targetQty} →{" "}
                  {targetQty + (Number(form.qty) || 0)}
                </span>
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={printLatestSuratJalan}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs sm:text-sm flex items-center"
              >
                <FaPrint className="mr-2" />
                Cetak Surat Jalan (Terbaru)
              </button>
            </div>
          </div>
        </div>

        {/* admin pending requests */}
        <div
          className={`p-4 rounded shadow mb-6 ${cardClass}`}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">
              Pending Transfer Requests{" "}
              {isAdmin ? "(Admin Mode)" : ""}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={exportHistoryExcel}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs flex items-center"
              >
                <FaFileExcel className="mr-1" /> Export Sesi
              </button>
            </div>
          </div>

          {isAdmin ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead
                  className={
                    isDark ? "bg-slate-900/60" : "bg-slate-100"
                  }
                >
                  <tr>
                    <th className="p-2 border">No</th>
                    <th className="p-2 border">Tanggal</th>
                    <th className="p-2 border">Dari</th>
                    <th className="p-2 border">Ke</th>
                    <th className="p-2 border">SKU</th>
                    <th className="p-2 border">QTY</th>
                    <th className="p-2 border">PIC</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(pendingRequests || []).length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-3 border text-center text-xs text-gray-500"
                      >
                        Tidak ada request
                      </td>
                    </tr>
                  )}
                  {(pendingRequests || []).map(
                    (req, idx) => (
                      <tr
                        key={req.id || idx}
                        className={
                          isDark
                            ? "hover:bg-slate-800"
                            : "hover:bg-gray-50"
                        }
                      >
                        <td className="p-2 border text-center">
                          {idx + 1}
                        </td>
                        <td className="p-2 border">
                          {req.tanggal}
                        </td>
                        <td className="p-2 border">{req.dari}</td>
                        <td className="p-2 border">{req.ke}</td>
                        <td className="p-2 border font-mono">
                          {req.sku}
                        </td>
                        <td className="p-2 border text-center">
                          {req.qty}
                        </td>
                        <td className="p-2 border">{req.pic}</td>
                        <td className="p-2 border">
                          {req.status || "Pending"}
                        </td>
                        <td className="p-2 border text-center space-x-2">
                          <button
                            onClick={() =>
                              approveRequest(req)
                            }
                            className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs inline-flex items-center"
                          >
                            <FaCheck className="mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              rejectRequest(req)
                            }
                            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs inline-flex items-center ml-2"
                          >
                            <FaTimes className="mr-1" />
                            Reject
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`text-sm ${subTextClass}`}>
              Sebagai user biasa, kamu dapat membuat request transfer.
              Admin akan melihat halaman ini untuk approve.
            </div>
          )}
        </div>

        {/* session history table */}
        <div
          className={`p-4 rounded shadow ${cardClass}`}
        >
          <h3 className="font-semibold mb-3">
            Riwayat Transfer (Sesi Ini)
          </h3>
          <div className="overflow-x-auto">
            <table
              ref={tableRef}
              className="w-full text-xs sm:text-sm border-collapse"
            >
              <thead
                className={
                  isDark ? "bg-slate-900/60" : "bg-slate-100"
                }
              >
                <tr>
                  <th className="p-2 border">No</th>
                  <th className="p-2 border">Tanggal</th>
                  <th className="p-2 border">Dari</th>
                  <th className="p-2 border">Ke</th>
                  <th className="p-2 border">SKU</th>
                  <th className="p-2 border">Nama</th>
                  <th className="p-2 border">Qty</th>
                  <th className="p-2 border">Harga</th>
                  <th className="p-2 border">PIC</th>
                  <th className="p-2 border">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {sessionHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-3 border text-center text-xs text-gray-500"
                    >
                      Belum ada riwayat
                    </td>
                  </tr>
                )}
                {sessionHistory.map((h, idx) => (
                  <tr
                    key={h.id || idx}
                    className={
                      isDark
                        ? "hover:bg-slate-800"
                        : "hover:bg-gray-50"
                    }
                  >
                    <td className="p-2 border text-center">
                      {idx + 1}
                    </td>
                    <td className="p-2 border">{h.tanggal}</td>
                    <td className="p-2 border">{h.dari}</td>
                    <td className="p-2 border">{h.ke}</td>
                    <td className="p-2 border font-mono">
                      {h.sku}
                    </td>
                    <td className="p-2 border">{h.nama}</td>
                    <td className="p-2 border text-center">
                      {h.qty}
                    </td>
                    <td className="p-2 border text-right">
                      Rp {fmt(h.harga)}
                    </td>
                    <td className="p-2 border">{h.pic}</td>
                    <td className="p-2 border text-xs">
                      {h.keterangan}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
