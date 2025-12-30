import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaExchangeAlt, FaSearch, FaPlus } from "react-icons/fa";

import {
  listenMasterToko,
  listenMasterKategoriBarang,
  listenMasterBarang,
} from "../services/FirebaseService";
import { hitungStokBarang } from "../utils/stockUtils";

import FirebaseService from "../services/FirebaseService";
import { ref, onValue, update, push } from "firebase/database";
import { db } from "../firebase/FirebaseInit";
import TableTransferBarang from "./table/TableTransferBarang";
import PrintSuratJalan from "./Print/PrintSuratJalan";

/* ================= KONFIG ================= */
const KATEGORI_IMEI = ["SEPEDA LISTRIK", "MOTOR LISTRIK", "HANDPHONE"];
const TODAY = new Date().toISOString().slice(0, 10);

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

/* ========================================================= */
export default function TransferBarang() {
  const navigate = useNavigate();
  const location = useLocation();
  const suratJalanRef = useRef(null);

  /* ================= TOKO ================= */
  const TOKO_LOGIN = localStorage.getItem("TOKO_LOGIN") || "CILANGKAP PUSAT";
  const TOKO_FROM_INVENTORY = location.state?.toko || TOKO_LOGIN;

  /* ================= FORM ================= */
  const [form, setForm] = useState({
    tanggal: TODAY,
    noDo: generateNoDO(),
    noSuratJalan: generateNoSuratJalan(),
    tokoPengirim: TOKO_FROM_INVENTORY,
    ke: "",
    pengirim: "",
    kategori: "",
    brand: "",
    barang: "",
    imeis: [],
    qty: 0,
  });

  const isKategoriImei = useMemo(
    () => KATEGORI_IMEI.includes(form.kategori),
    [form.kategori]
  );

  /* ================= DATA ================= */
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [masterToko, setMasterToko] = useState([]);
  const [masterKategori, setMasterKategori] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentRole, setCurrentRole] = useState("user");

  /* ================= UI ================= */
  const [imeiInput, setImeiInput] = useState("");
  const [imeiSearch, setImeiSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedSJ, setSelectedSJ] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ================= HELPER ================= */
  const normalize = (v) =>
    String(v || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();

  // ================= INVENTORY NORMALIZATION (FINAL) =================
  // ================= INVENTORY DARI TOKO/TRANSAKSI (FINAL) =================
  useEffect(() => {
    return onValue(ref(db, "toko"), (snap) => {
      const rows = [];

      snap.forEach((tokoSnap) => {
        const transaksiSnap = tokoSnap.child("transaksi");
        if (!transaksiSnap.exists()) return;

        transaksiSnap.forEach((trx) => {
          const v = trx.val();

          // HANYA STOK YANG VALID
          if (!v.IMEI) return;

          rows.push({
            id: trx.key,
            imei: String(v.IMEI).trim(),
            toko: String(v.NAMA_TOKO).trim(),
            namaBrand: String(v.NAMA_BRAND || "").trim(),
            namaBarang: String(v.NAMA_BARANG || "").trim(),
            kategori: String(v.KATEGORI_BRAND || "").trim(),

            // STATUS STOK
            status: "AVAILABLE", // ⬅️ PENTING
          });
        });
      });

      console.log("🔥 STOK DARI TOKO/TRANSAKSI:", rows);
      setInventory(rows);
    });
  }, []);

  // ================= DARI NOTIFIKASI NAVBAR =================
  useEffect(() => {
    if (location.state?.fromNotif) {
      // set filter ke Pending
      setFilterStatus(location.state.filterStatus || "Pending");

      // scroll ke table transfer
      setTimeout(() => {
        const el = document.getElementById("table-transfer-barang");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [location.state]);

  /* ================= MASTER DATA ================= */
  useEffect(() => {
    listenMasterToko(setMasterToko);
    listenMasterKategoriBarang(setMasterKategori);
    listenMasterBarang(setMasterBarang);
    FirebaseService.listenTransferRequests(setHistory);
    FirebaseService.listenUsers(setUsers);
  }, []);

  /* ================= ROLE ================= */
  useEffect(() => {
    const local = JSON.parse(localStorage.getItem("user") || "{}");
    const me = users.find(
      (u) =>
        String(u.username || "").toLowerCase() ===
        String(local.username || "").toLowerCase()
    );
    if (me?.role) setCurrentRole(me.role.toLowerCase());
  }, [users]);

  const isSuperAdmin = currentRole === "superadmin";

  /* ================= OPTIONS ================= */
  const TOKO_OPTIONS = useMemo(() => {
    return (masterToko || [])
      .map((t) => String(t.namaToko || t.nama || "").trim())
      .filter(Boolean);
  }, [masterToko]);

  // ================= BRAND OPTIONS (DARI STOK TOKO) =================
  // ================= BRAND OPTIONS (REAL STOK) =================
  const brandOptions = useMemo(() => {
    if (!form.tokoPengirim || !form.kategori) return [];

    return [
      ...new Set(
        inventory
          .filter(
            (i) =>
              i.status === "AVAILABLE" &&
              i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
              i.kategori.toUpperCase() === form.kategori.toUpperCase()
          )
          .map((i) => i.namaBrand)
          .filter(Boolean)
      ),
    ];
  }, [inventory, form.tokoPengirim, form.kategori]);

  // ================= BARANG OPTIONS (DARI STOK TOKO) =================
  const barangOptions = useMemo(() => {
    if (!form.tokoPengirim || !form.kategori || !form.brand) return [];

    return [
      ...new Set(
        inventory
          .filter(
            (i) =>
              i.status === "AVAILABLE" &&
              i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
              i.kategori.toUpperCase() === form.kategori.toUpperCase() &&
              i.namaBrand.toUpperCase() === form.brand.toUpperCase()
          )
          .map((i) => i.namaBarang)
          .filter(Boolean)
      ),
    ];
  }, [inventory, form.tokoPengirim, form.kategori, form.brand]);

  // ================= CEK FORM SUDAH LENGKAP =================
  const isFormComplete =
    form.tokoPengirim &&
    form.ke &&
    form.brand &&
    form.barang &&
    Array.isArray(form.imeis) &&
    form.imeis.length > 0;

  const imeiSource = useMemo(() => {
    if (!form.barang || !form.tokoPengirim) return [];

    return inventory
      .filter(
        (i) =>
          i.status === "AVAILABLE" &&
          i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
          i.namaBarang.toUpperCase() === form.barang.toUpperCase()
      )
      .map((i) => i.imei);
  }, [inventory, form.tokoPengirim, form.barang]);

  // ================= SEARCH IMEI (ENTER → AUTO ISI FORM) =================
  const handleSearchByImei = () => {
    const im = imeiSearch?.trim();
    if (!im) return;

    // Cari IMEI di inventory (sumber stok dari toko/transaksi)
    const found = inventory.find((i) => String(i.imei) === String(im));

    if (!found) {
      alert("❌ IMEI tidak tersedia di stok");
      return;
    }

    // Auto isi form berdasarkan IMEI
    setForm((f) => ({
      ...f,
      tokoPengirim: found.toko,
      dari: found.toko,
      brand: found.namaBrand,
      barang: found.namaBarang,
      kategori: found.kategori,
      imeis: f.imeis.includes(found.imei) ? f.imeis : [...f.imeis, found.imei],
      qty: (f.imeis?.length || 0) + 1,
    }));

    setImeiSearch("");
  };

  /* ================= IMEI ================= */
  const addImei = () => {
    if (!imeiSource.includes(imeiInput)) return;

    setForm((f) => ({
      ...f,
      imeis: [...f.imeis, imeiInput],
      qty: f.imeis.length + 1,
    }));

    setImeiInput("");
  };
  

  // ================= EDIT TRANSFER (DRAFT) =================
  const handleEdit = (row) => {
    alert(
      `Edit transfer\n\nNo SJ: ${row.noSuratJalan}\n(Fitur edit bisa diaktifkan nanti)`
    );
  };

  // ================= VOID / BATAL TRANSFER =================
  const voidTransfer = async (row) => {
    if (!isSuperAdmin) {
      alert("Hanya Superadmin yang bisa membatalkan transfer");
      return;
    }

    try {
      // ⬅️ kembalikan IMEI ke toko asal
      for (const im of row.imeis || []) {
        await update(ref(db, `inventory/${row.ke}/${im}`), {
          STATUS: "TRANSFERRED",
        });

        await update(ref(db, `inventory/${row.tokoPengirim}/${im}`), {
          STATUS: "AVAILABLE",
        });
      }

      // ⬅️ update status transfer
      await FirebaseService.updateTransferRequest(row.id, {
        status: "Voided",
        voidedAt: Date.now(),
      });

      alert("↩️ Transfer berhasil dibatalkan");
    } catch (err) {
      console.error(err);
      alert("Gagal membatalkan transfer");
    }
  };

  const removeImei = (idx) => {
    const next = [...form.imeis];
    next.splice(idx, 1);
    setForm((f) => ({ ...f, imeis: next, qty: next.length }));
  };

  const handleSearchImei = () => {
    const im = imeiSearch.trim();
    if (!im) return;

    const found = inventory.find(
      (i) => i.imei === im && i.status === "AVAILABLE"
    );

    if (!found) {
      alert("❌ IMEI tidak tersedia di stok");
      return;
    }

    setForm((f) => ({
      ...f,
      tokoPengirim: found.toko,
      dari: found.toko,
      brand: found.namaBrand,
      barang: found.namaBarang,
      kategori: found.kategori,
      imeis: f.imeis.includes(found.imei) ? f.imeis : [...f.imeis, found.imei],
      qty: f.imeis.length + 1,
    }));

    setImeiSearch("");
  };

  // ================= FILTER HISTORY (FIX ERROR) =================
  const filteredHistory = useMemo(() => {
    if (!Array.isArray(history)) return [];

    return history.filter((h) =>
      filterStatus === "ALL" ? true : h.status === filterStatus
    );
  }, [history, filterStatus]);

// ================= HITUNG STOK TOKO (REALTIME) =================
const stokPengirim = useMemo(() => {
  if (!form.tokoPengirim || !form.barang) return 0;

  return inventory.filter(
    (i) =>
      i.status === "AVAILABLE" &&
      i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
      i.namaBarang.toUpperCase() === form.barang.toUpperCase()
  ).length;
}, [inventory, form.tokoPengirim, form.barang]);

  // ================= SUBMIT TRANSFER (FINAL 100%) =================
  const submitTransfer = async () => {
    try {
      setLoading(true);
  
      // ================= VALIDASI =================
      if (
        !form.tokoPengirim ||
        !form.ke ||
        !form.barang ||
        !Array.isArray(form.imeis) ||
        form.imeis.length === 0
      ) {
        alert("❌ Data transfer belum lengkap");
        return;
      }
  
      // ================= VALIDASI STOK REALTIME =================
      if (stokPengirim < form.imeis.length) {
        alert(
          `❌ Stok ${form.tokoPengirim} tidak mencukupi.\n\n` +
            `Stok tersedia: ${stokPengirim}\n` +
            `Diminta: ${form.imeis.length}`
        );
        return;
      }
  
      // ================= PAYLOAD =================
      const payload = {
        tanggal: form.tanggal,
        noDo: form.noDo,
        noSuratJalan: form.noSuratJalan,
        pengirim: form.pengirim || "SYSTEM",
  
        tokoPengirim: form.tokoPengirim,
        dari: form.tokoPengirim,
        ke: form.ke,
  
        kategori: form.kategori,
        brand: form.brand,
        barang: form.barang,
        imeis: form.imeis,
        qty: form.imeis.length,
  
        status: "Pending",
        createdAt: Date.now(),
      };
  
      await FirebaseService.createTransferRequest(payload);
  
      alert("✅ Transfer berhasil (Menunggu Approved Superadmin)");
  
      // ================= RESET FORM =================
      setForm((f) => ({
        ...f,
        brand: "",
        barang: "",
        imeis: [],
        qty: 0,
      }));
    } catch (err) {
      console.error(err);
      alert("❌ Gagal submit transfer");
    } finally {
      setLoading(false);
    }
  };
  

  /* ================= RENDER ================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-blue-700 to-purple-700 p-4">
      <div className="max-w-7xl mx-auto bg-white/95 rounded-2xl shadow-2xl p-6 space-y-6">
        <h2 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
          <FaExchangeAlt /> TRANSFER BARANG
        </h2>

        {/* SEARCH IMEI */}
        <div className="relative w-full md:w-96">
          <input
            placeholder="🔍 Cari / Input IMEI lalu Enter..."
            value={imeiSearch}
            onChange={(e) => setImeiSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchByImei()}
            className="
        w-full px-4 py-2 rounded-xl
        bg-white/90 backdrop-blur
        border border-indigo-300
        focus:ring-4 focus:ring-indigo-300/50
        shadow-lg
        transition
      "
          />
        </div>

        {/* FORM */}
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold">Tanggal</label>
            <input
              type="date"
              className="input"
              value={form.tanggal}
              readOnly
            />
          </div>

          <div>
            <label className="text-xs font-semibold">No Do</label>
            <input className="input" value={form.noDo} readOnly />{" "}
          </div>

          <div>
            <label className="text-xs font-semibold">Surat Jalan</label>
            <input className="input" value={form.noSuratJalan} readOnly />{" "}
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

          {/* TOKO PENGIRIM */}
          <div>
            <label className="text-xs font-semibold">Toko Pengirim</label>
            <input
              className="input bg-gray-100 cursor-not-allowed"
              value={form.tokoPengirim}
              readOnly
            />

            <datalist id="toko-list">
              {TOKO_OPTIONS.filter((t) => t !== form.tokoPengirim).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
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

          {/* KATEGORI BARANG */}
          <div>
            <label className="text-xs font-semibold">Kategori Barang</label>
            <select
              className="input"
              value={form.kategori}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kategori: e.target.value,
                  brand: "",
                  barang: "",
                  imeis: [],
                  qty: 0,
                }))
              }
            >
              <option value="">Pilih Kategori Barang</option>
              {masterKategori.map((k) => (
                <option key={k.id} value={k.namaKategori}>
                  {k.namaKategori}
                </option>
              ))}
            </select>
          </div>

          {/* NAMA BRAND */}
          <div>
            <label className="text-xs font-semibold">Nama Brand</label>
            <input
              list="brand-list"
              className="input"
              value={form.brand}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  brand: e.target.value,
                  barang: "",
                  imeis: [],
                  qty: 0,
                }))
              }
              placeholder="Pilih / ketik nama brand"
            />

            <datalist id="brand-list">
              {brandOptions.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          {/* NAMA BARANG */}
          <div>
            <label className="text-xs font-semibold">Nama Barang</label>
            <input
              list="barang-list"
              className="input"
              value={form.barang}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  barang: e.target.value,
                  imeis: [],
                  qty: 0,
                }))
              }
              placeholder="Pilih / ketik nama barang"
            />

            <datalist id="barang-list">
              {barangOptions.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          {/* QTY */}
          <div>
            <label className="text-xs font-semibold">QTY (Jumlah Barang)</label>
            <input
              type="number"
              min="1"
              className="input bg-gray-100"
              value={form.qty}
              readOnly={form.kategori !== "ACCESSORIES"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  qty: Number(e.target.value),
                }))
              }
              placeholder="Jumlah Barang"
            />
          </div>
        </div>

        {/* IMEI / QTY */}
        {isKategoriImei ? (
          <>
            <div className="flex gap-2">
              <label className="text-xs font-semibold">NO IMEI</label>
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

              <button onClick={addImei} className="btn-indigo">
                <FaPlus />
              </button>
            </div>
            <datalist id="imei-list">
              {imeiSource.map((im) => (
                <option key={im} value={im} />
              ))}
            </datalist>

            <div className="flex flex-wrap gap-2">
              {form.imeis.map((im, i) => (
                <span key={im} className="tag">
                  {im}
                  <button onClick={() => removeImei(i)}>×</button>
                </span>
              ))}
            </div>
          </>
        ) : (
          <input
            type="number"
            min="1"
            className="input"
            value={form.qty}
            onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
            placeholder="Qty"
          />
        )}

        <button
          onClick={submitTransfer}
          disabled={loading}
          className="btn-submit"
        >
          {loading ? "Processing..." : "SUBMIT TRANSFER"}
        </button>

        {isFormComplete && <TableTransferBarang currentRole={currentRole} />}
      </div>

      {selectedSJ && showPreview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-start overflow-auto p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-4">
            <PrintSuratJalan
              ref={suratJalanRef}
              data={{
                noSuratJalan: selectedSJ.noSuratJalan,
                tanggal: selectedSJ.tanggal,
                tokoPengirim: selectedSJ.tokoPengirim,
                ke: selectedSJ.ke,
                pengirim: selectedSJ.pengirim,
                items: [
                  {
                    barang: selectedSJ.barang,
                    qty: selectedSJ.qty,
                    imeis: selectedSJ.imeis || [],
                  },
                ],
              }}
            />

            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => window.print()} className="btn-indigo">
                🖨️ Print
              </button>

              <button onClick={() => setShowPreview(false)} className="btn-red">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLE ================= */
const style = document.createElement("style");
style.innerHTML = `
.input{padding:10px;border:1px solid #cbd5e1;border-radius:12px;width:100%}
.input:focus{outline:none;border-color:#4f46e5;box-shadow:0 0 0 2px rgba(79,70,229,.2)}
.btn-indigo{background:linear-gradient(135deg,#4f46e5,#4338ca);color:white;padding:10px 16px;border-radius:12px;font-weight:600}
.btn-submit{background:linear-gradient(135deg,#16a34a,#22c55e);color:white;padding:12px;border-radius:14px;font-weight:700}
.tag{background:#eef2ff;padding:6px 10px;border-radius:10px}
`;
document.head.appendChild(style);
