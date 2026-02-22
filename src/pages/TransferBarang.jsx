import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaExchangeAlt, FaSearch, FaPlus, FaPrint } from "react-icons/fa";

import {
  listenMasterToko,
  listenMasterKategoriBarang,
  listenMasterBarang,
  lockImeiTransfer,
  listenKaryawan,
} from "../services/FirebaseService";
import { hitungStokBarang } from "../utils/stockUtils";

import FirebaseService from "../services/FirebaseService";
import { ref, onValue, update, push, off } from "firebase/database";
import { db } from "../firebase/FirebaseInit";
import TableTransferBarang from "./table/TableTransferBarang";
import PrintSuratJalan from "./Print/PrintSuratJalan";

const initialForm = {
  tanggal: new Date().toISOString().slice(0, 10),
  noDo: "",
  noSuratJalan: "",
  dari: "",
  ke: "",
  tokoPengirim: "",
  pengirim: "",
  kategori: "",
  brand: "",
  barang: "",
  imeis: [],
  qty: 0,
  status: "Pending",
};

const KATEGORI_WAJIB_IMEI = ["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"];

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
  const [inventory, setInventory] = useState([]);
  const [stokAccessories, setStokAccessories] = useState([]);
  const [previewSJ, setPreviewSJ] = useState(null);

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

  const isKategoriImei = useMemo(() => {
    if (!form.kategori) return false;

    // ✅ cara lama (tetap dipakai)
    const byKategori = inventory.some(
      (i) => i.kategori?.toUpperCase() === form.kategori.toUpperCase() && i.imei
    );

    // ✅ tambahan FIX:
    // kalau sudah ada IMEI di form → pasti barang IMEI
    if (form.imeis && form.imeis.length > 0) return true;

    return byKategori;
  }, [form.kategori, inventory, form.imeis]);

  /* ================= DATA ================= */

  const [history, setHistory] = useState([]);
  const [masterToko, setMasterToko] = useState([]);
  const [masterKategori, setMasterKategori] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentRole, setCurrentRole] = useState("user");
  const isSuperAdmin = String(currentRole || "").toLowerCase() === "superadmin";

  const [masterKaryawan, setMasterKaryawan] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [inventoryAccessories, setInventoryAccessories] = useState([]);

  // ================= INVENTORY ACCESSORIES (NON IMEI) =================
  useEffect(() => {
    return onValue(ref(db, "toko"), (snap) => {
      const map = {};

      snap.forEach((tokoSnap) => {
        const transaksiSnap = tokoSnap.child("transaksi");
        if (!transaksiSnap.exists()) return;

        transaksiSnap.forEach((trx) => {
          const v = trx.val();

          // ✅ hanya NON IMEI
          if (v.IMEI) return;

          const key = `${v.NAMA_TOKO}|${v.NAMA_BRAND}|${v.NAMA_BARANG}`;
          const metode = String(v.PAYMENT_METODE || "").toUpperCase();

          if (!map[key]) {
            map[key] = {
              toko: String(v.NAMA_TOKO || "").trim(),
              namaBrand: String(v.NAMA_BRAND || "").trim(),
              namaBarang: String(v.NAMA_BARANG || "").trim(),
              kategori: String(v.KATEGORI_BRAND || "").trim(),
              qty: 0,
            };
          }

          if (metode === "PEMBELIAN") {
            map[key].qty += Number(v.QTY || 0);
          }

          if (metode === "PENJUALAN") {
            map[key].qty -= Number(v.QTY || 0);
          }

          if (metode === "TRANSFER_KELUAR") {
            map[key].qty -= Number(v.QTY || 0);
          }

          if (metode === "TRANSFER_MASUK") {
            map[key].qty += Number(v.QTY || 0);
          }

          if (metode === "REFUND") {
            map[key].qty += Number(v.QTY || 0);
          }
        });
      });

      setInventoryAccessories(Object.values(map).filter((i) => i.qty > 0));
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "stok_toko"), (snap) => {
      const data = snap.val() || {};
      setStokAccessories(data);
    });
  }, []);

  const handleDeleteTransfer = (index) => {
    if (!window.confirm("Hapus item transfer ini?")) return;

    setDaftarTransfer((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditTransfer = (index) => {
    const item = daftarTransfer[index];

    setForm({
      ...item,
    });

    setEditIndex(index);

    // hapus dari daftar sementara
    setDaftarTransfer((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const unsub = listenKaryawan((data) => {
      setMasterKaryawan(Array.isArray(data) ? data : []);
    });

    return () => unsub && unsub();
  }, []);

  /* ================= UI ================= */
  const [imeiInput, setImeiInput] = useState("");
  const [imeiSearch, setImeiSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedSJ, setSelectedSJ] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [daftarTransfer, setDaftarTransfer] = useState([]);

  // ================= INVENTORY NORMALIZATION (FINAL) =================
  useEffect(() => {
    return onValue(ref(db, "toko"), (snap) => {
      const map = {}; // key = imei

      snap.forEach((tokoSnap) => {
        const transaksiSnap = tokoSnap.child("transaksi");
        if (!transaksiSnap.exists()) return;

        transaksiSnap.forEach((trx) => {
          const v = trx.val();
          if (!v.IMEI) return;

          const imei = String(v.IMEI).trim();
          const metode = String(v.PAYMENT_METODE || "").toUpperCase();

          if (!map[imei]) {
            map[imei] = {
              imei,
              status: "AVAILABLE",
              toko: String(v.NAMA_TOKO || "").trim(),
              namaBrand: String(v.NAMA_BRAND || "").trim(),
              namaBarang: String(v.NAMA_BARANG || "").trim(),
              kategori: String(v.KATEGORI_BRAND || "").trim(),
            };
          }

          // 🔥 RULE MUTLAK (WAJIB)
          if (metode === "REFUND") {
            map[imei].status = "AVAILABLE";
          } else if (metode === "PENJUALAN") {
            map[imei].status = "SOLD";
          } else if (metode === "TRANSFER_KELUAR") {
            // JANGAN set OUT permanen
            // biarkan status tetap AVAILABLE
            if (map[imei].status !== "SOLD") {
              map[imei].status = "AVAILABLE";
            }
          } else if (metode === "TRANSFER_MASUK") {
            if (map[imei].status !== "SOLD") map[imei].status = "AVAILABLE";
          }
        });
      });

      setInventory(Object.values(map));
    });
  }, []);

  useEffect(() => {
    const barangRef = ref(db, "dataManagement/masterBarang");

    onValue(barangRef, (snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data).map(([id, v]) => ({
        id,
        ...v,
      }));
      setMasterBarang(arr);
    });

    return () => off(barangRef);
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
  /* ================= MASTER DATA ================= */
  useEffect(() => {
    listenMasterToko(setMasterToko);
    listenMasterKategoriBarang(setMasterKategori);
    listenMasterBarang(setMasterBarang);
    FirebaseService.listenTransferRequests(setHistory);

    // 🔥 MASTER KARYAWAN (NAMA PENGIRIM)
    const unsubKaryawan = listenKaryawan((data) => {
      setMasterKaryawan(Array.isArray(data) ? data : []);
    });

    return () => {
      unsubKaryawan && unsubKaryawan();
    };
  }, []);

  /* ================= ROLE ================= */
  useEffect(() => {
    const login = JSON.parse(localStorage.getItem("user") || "{}");

    const roleFromLogin =
      login.role || login.roleDb || login.level || login.tipe || "user";

    setCurrentRole(String(roleFromLogin).toLowerCase());
  }, []);

  /* ================= HELPER ================= */
  const normalize = (v) =>
    String(v || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();

  // ================= NORMALIZE IMEI =================
  const normalizeImei = (v) =>
    String(v || "")
      .trim()
      .replace(/\s+/g, "")
      .toUpperCase();

  // ================= GLOBAL HARD LOCK ENGINE =================
  // const isImeiGloballyLocked = (imei) => {
  //   const clean = normalizeImei(imei);
  //   if (!clean) return true;

  //   // 1️⃣ Cek di form sekarang
  //   if (form.imeis.some((im) => normalizeImei(im) === clean)) return true;

  //   // 2️⃣ Cek di daftar transfer draft
  //   if (
  //     daftarTransfer.some((item) =>
  //       (item.imeis || []).some((im) => normalizeImei(im) === clean)
  //     )
  //   )
  //     return true;

  //   // 3️⃣ Cek di seluruh history transfer (SEMUA STATUS KECUALI VOIDED)
  //   if (
  //     history.some(
  //       (trx) =>
  //         trx.status !== "Voided" &&
  //         (trx.imeis || []).some((im) => normalizeImei(im) === clean)
  //     )
  //   )
  //     return true;

  //   // 4️⃣ 🔥 Cek di INVENTORY kalau status sudah OUT
  //   const inv = inventory.find((i) => normalizeImei(i.imei) === clean);

  //   if (!inv) return true;

  //   if (inv.status === "OUT") return true;

  //   return false;
  // };

  // ================= FINAL STRICT IMEI CHECK =================
  // ================= FINAL IMEI VALIDATOR =================
  // const isImeiDuplicateAnywhere = (imei) => {
  //   const clean = normalizeImei(imei);
  //   if (!clean) return true;

  //   // 1️⃣ cek di form sekarang
  //   if (form.imeis.some((im) => normalizeImei(im) === clean)) return true;

  //   // 2️⃣ cek di draft transfer
  //   if (
  //     daftarTransfer.some((item) =>
  //       (item.imeis || []).some((im) => normalizeImei(im) === clean)
  //     )
  //   )
  //     return true;

  //   // 3️⃣ cek di inventory REAL STATUS (INI YANG PENTING)
  //   const found = inventory.find((i) => normalizeImei(i.imei) === clean);

  //   if (!found) return true;
  //   if (found.status !== "AVAILABLE") return true;

  //   return false;
  // };

  // ================= GLOBAL IMEI LOCK SET =================
  const globalImeiSet = useMemo(() => {
    const set = new Set();

    // history transfer (kecuali Voided)
    history.forEach((trx) => {
      if (trx.status === "Voided") return;

      (trx.imeis || []).forEach((im) => {
        set.add(normalizeImei(im));
      });
    });

    // draft transfer
    daftarTransfer.forEach((item) => {
      (item.imeis || []).forEach((im) => {
        set.add(normalizeImei(im));
      });
    });

    // form sekarang
    form.imeis.forEach((im) => {
      set.add(normalizeImei(im));
    });

    return set;
  }, [history, daftarTransfer, form.imeis]);

  /* ================= OPTIONS ================= */
  const TOKO_OPTIONS = useMemo(() => {
    return (masterToko || [])
      .map((t) => String(t.namaToko || t.nama || "").trim())
      .filter(Boolean);
  }, [masterToko]);

  const brandOptions = useMemo(() => {
    if (!form.kategori || !form.tokoPengirim) return [];

    // ================= ACCESSORIES =================
    if (form.kategori === "ACCESSORIES") {
      const brandsFromAccessories = [
        ...new Set(
          inventoryAccessories
            .filter(
              (i) => i.toko.toUpperCase() === form.tokoPengirim.toUpperCase()
            )
            .map((i) => i.namaBrand)
            .filter(Boolean)
        ),
      ];

      // 🔥 fallback ke MASTER BARANG kalau kosong
      if (brandsFromAccessories.length === 0) {
        return [
          ...new Set(
            masterBarang
              .filter(
                (b) =>
                  String(b.kategoriBarang || "")
                    .toUpperCase()
                    .trim() === form.kategori.toUpperCase().trim()
              )
              .map((b) => b.brand)
              .filter(Boolean)
          ),
        ];
      }

      return brandsFromAccessories;
    }

    // ================= NON ACCESSORIES =================
    const brandsFromInventory = [
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

    // 🔥 JANGAN UBAH LOGIC LAMA
    // kalau ada stok → pakai ini
    if (brandsFromInventory.length > 0) {
      return brandsFromInventory;
    }

    // 🔥 kalau tidak ada stok → ambil dari MASTER BARANG
    return [
      ...new Set(
        masterBarang
          .filter(
            (b) =>
              String(b.kategoriBarang || "")
                .toUpperCase()
                .trim() === form.kategori.toUpperCase().trim()
          )
          .map((b) => b.brand)
          .filter(Boolean)
      ),
    ];
  }, [
    inventory,
    inventoryAccessories,
    masterBarang,
    form.tokoPengirim,
    form.kategori,
  ]);

  // ================= REAL STOCK NON IMEI PER TOKO =================
  const stokNonImeiPerToko = useMemo(() => {
    const map = {};

    history
      .filter((h) => h.status === "Approved")
      .forEach((h) => {
        const metodeMasuk = ["TRANSFER_MASUK"];
        const metodeKeluar = ["TRANSFER_KELUAR"];

        if (!Array.isArray(h.imeis) || h.imeis.length > 0) return; // skip IMEI

        const key = `${h.tokoPengirim}|${h.brand}|${h.barang}`;
        const qty = Number(h.qty || 0);

        if (!map[key]) map[key] = 0;

        if (metodeKeluar.includes("TRANSFER_KELUAR")) {
          map[key] -= qty;
        }

        if (metodeMasuk.includes("TRANSFER_MASUK")) {
          map[key] += qty;
        }
      });

    return map;
  }, [history]);

  // ================= BARANG OPTIONS (DARI STOK TOKO) =================
  const barangOptions = useMemo(() => {
    if (!form.kategori || !form.brand) return [];

    if (form.kategori === "ACCESSORIES") {
      return [
        ...new Set(
          inventoryAccessories
            .filter(
              (i) =>
                i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
                i.namaBrand.toUpperCase() === form.brand.toUpperCase()
            )
            .map((i) => i.namaBarang)
        ),
      ];
    }

    // ambil dari MASTER BARANG dulu
    const masterList = masterBarang
      .filter(
        (b) =>
          String(b.kategoriBarang || "").toUpperCase() ===
            form.kategori.toUpperCase() &&
          String(b.brand || "").toUpperCase() === form.brand.toUpperCase()
      )
      .map((b) => b.namaBarang);

    // ambil dari INVENTORY
    const inventoryList = inventory
      .filter(
        (i) =>
          i.kategori?.toUpperCase() === form.kategori.toUpperCase() &&
          i.namaBrand?.toUpperCase() === form.brand.toUpperCase()
      )
      .map((i) => i.namaBarang);

    return [...new Set([...masterList, ...inventoryList])];
  }, [inventory, masterBarang, form.kategori, form.brand]);

  const stokTersedia = useMemo(() => {
    if (!form.tokoPengirim || !form.barang) return 0;

    // =====================
    // BARANG IMEI
    // =====================
    if (isKategoriImei) {
      return inventory.filter(
        (i) =>
          i.status === "AVAILABLE" &&
          i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
          i.namaBarang.toUpperCase() === form.barang.toUpperCase()
      ).length;
    }

    // =====================
    // NON IMEI (REAL STOCK PER TOKO)
    // =====================
    const found = inventoryAccessories.find(
      (i) =>
        i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
        i.namaBrand.toUpperCase() === form.brand.toUpperCase() &&
        i.namaBarang.toUpperCase() === form.barang.toUpperCase()
    );

    return found ? Number(found.qty || 0) : 0;
  }, [inventory, inventoryAccessories, form, isKategoriImei]);

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
          i.status === "AVAILABLE" && // 🔥 hanya yang belum terjual
          i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
          i.namaBarang.toUpperCase() === form.barang.toUpperCase()
      )
      .map((i) => i.imei);
  }, [inventory, form.tokoPengirim, form.barang]);

  const addImei = () => {
    const clean = normalizeImei(imeiInput);
    if (!imeiSource.includes(clean)) return;

  

    setForm((f) => ({
      ...f,
      imeis: [...f.imeis, clean],
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

  const transferValidList = history.filter((item) => item.status !== "TERJUAL");

  // ================= VALIDASI IMEI SEBELUM MASUK FORM =================
  const validateImeiBeforeAdd = (im) => {
    if (!im) return false;

    const found = inventory.find(
      (i) => String(i.imei).trim() === String(im).trim()
    );

    console.log("IMEI dicari:", im, "FOUND:", found);

    if (!found) {
      alert("❌ No IMEI tidak ditemukan di stok");
      return false;
    }

    if (found.status !== "AVAILABLE") {
      alert("❌ No IMEI sudah TERJUAL dan STOCK TIDAK TERSEDIA");
      return false;
    }

    return true;
  };

  const isImeiAlreadyTransferred = (imei) => {
    const found = inventory.find((i) => i.imei === imei);
    if (!found) return true; // tidak ada di stok

    return found.status !== "AVAILABLE"; // kalau bukan AVAILABLE = sudah keluar
  };

  // ================= FINAL IMEI VALIDATOR =================
  const isImeiValidForTransfer = (imei) => {
    const clean = normalizeImei(imei);
    if (!clean) return false;

    const found = inventory.find((i) => normalizeImei(i.imei) === clean);

    if (!found) {
      alert("❌ IMEI tidak ditemukan di inventory");
      return false;
    }

    // ❌ sudah terjual
    if (found.status === "SOLD") {
      alert("❌ IMEI sudah TERJUAL");
      return false;
    }

    // ❌ bukan AVAILABLE
    if (found.status !== "AVAILABLE") {
      alert("❌ IMEI sedang tidak tersedia");
      return false;
    }

    // ❌ terkunci
    if (found.LOCK_TRANSFER === true) {
      alert("❌ IMEI masih terkunci oleh transfer lain");
      return false;
    }

    // ❌ duplikat di form
    if (form.imeis.some((im) => normalizeImei(im) === clean)) {
      alert("❌ IMEI sudah ada di form");
      return false;
    }

    // ❌ duplikat di draft
    if (
      daftarTransfer.some((item) =>
        (item.imeis || []).some((im) => normalizeImei(im) === clean)
      )
    ) {
      alert("❌ IMEI sudah ada di daftar transfer");
      return false;
    }

    return true;
  };
  // ================= HARD BLOCK IMEI DUPLIKAT =================
  // const isImeiBlocked = (imei) => {
  //   const clean = String(imei || "").trim();
  //   if (!clean) return true;

  //   // ❌ sudah ada di form
  //   if (form.imeis.includes(clean)) {
  //     alert("❌ IMEI sudah ada di form ini");
  //     return true;
  //   }

  //   // ❌ sudah ada di daftar transfer draft
  //   const existsInDraft = daftarTransfer.some((item) =>
  //     (item.imeis || []).includes(clean)
  //   );

  //   if (existsInDraft) {
  //     alert("❌ IMEI sudah ada di daftar transfer");
  //     return true;
  //   }

  //   // ❌ sudah dipakai transfer Pending lain
  //   const existsInPending = history.some(
  //     (trx) => trx.status === "Pending" && (trx.imeis || []).includes(clean)
  //   );

  //   if (existsInPending) {
  //     alert("❌ IMEI sedang dalam proses transfer lain");
  //     return true;
  //   }

  //   return false;
  // };

  // ================= FINAL CLEAN IMEI VALIDATOR =================
const isImeiValid = (imei) => {
  const clean = normalizeImei(imei);
  if (!clean) return false;

  const found = inventory.find(
    (i) => normalizeImei(i.imei) === clean
  );

  // ❌ tidak ada di inventory
  if (!found) {
    alert("❌ IMEI tidak ditemukan di stok");
    return false;
  }

  // ❌ sudah terjual
  if (found.status === "SOLD") {
    alert("❌ IMEI sudah TERJUAL");
    return false;
  }

  // ❌ bukan AVAILABLE
  if (found.status !== "AVAILABLE") {
    alert("❌ IMEI tidak tersedia");
    return false;
  }

  // ❌ duplikat di form
  if (form.imeis.some((im) => normalizeImei(im) === clean)) {
    alert("❌ IMEI sudah ada di form");
    return false;
  }

  // ❌ duplikat di draft
  if (
    daftarTransfer.some((item) =>
      (item.imeis || []).some(
        (im) => normalizeImei(im) === clean
      )
    )
  ) {
    alert("❌ IMEI sudah ada di daftar transfer");
    return false;
  }

  return true;
};

  const handleAddImeiAuto = () => {
    const im = normalizeImei(imeiSearch);
    if (!im) return;

    if (!isImeiValid(im)) {
      setImeiSearch("");
      return;
    }

    const found = inventory.find(
      (i) => normalizeImei(i.imei) === im
    );

    // 🔥 CEK STOK TOKO (REAL TIME)
    const stokAvailable = inventory.filter(
      (i) =>
        i.status === "AVAILABLE" &&
        i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
        i.namaBarang.toUpperCase() === found.namaBarang.toUpperCase()
    ).length;

    if (stokAvailable <= 0) {
      alert("❌ Stok barang sudah HABIS (0)");
      return;
    }

    if (!found) {
      alert("❌ No IMEI tidak ditemukan di stok");
      return;
    }

    if (found.status !== "AVAILABLE") {
      alert("❌ IMEI tidak tersedia untuk transfer");
      return;
    }

    // ✅ STATUS BOLEH TRANSFER LAGI
    const allowedStatus = [
      "AVAILABLE",
      "TRANSFER_MASUK",
      "REFUND",
      "PEMBELIAN",
    ];

    if (!allowedStatus.includes(found.status)) {
      alert("❌ No IMEI tidak tersedia untuk transfer");
      return;
    }

    // ❌ DUPLIKAT DI FORM
    if (form.imeis.includes(found.imei)) {
      alert("❌ IMEI sudah ada di daftar");
      return;
    }

    // ❌ DUPLIKAT DI LIST TRANSFER
    const imeiSudahAda = daftarTransfer.some((item) =>
      (item.imeis || []).includes(found.imei)
    );

    if (imeiSudahAda) {
      alert("❌ IMEI sudah ada di daftar transfer");
      return;
    }

    // ❌ MASIH PENDING DI TRANSFER LAIN
    const imeiPending = history.some(
      (trx) =>
        trx.status === "Pending" && (trx.imeis || []).includes(found.imei)
    );

    if (imeiPending) {
      alert("❌ IMEI sedang dalam proses transfer lain");
      return;
    }

    setForm((f) => ({
      ...f,
      brand: found.namaBrand,
      barang: found.namaBarang,
      kategori: found.kategori,
      imeis: [...f.imeis, im],
      qty: (f.imeis?.length || 0) + 1,
    }));
  
    setImeiSearch("");
  };

  const handleSearchByImei = () => {
    const im = normalizeImei(imeiSearch);
    if (!im) return;


    const found = inventory.find((i) => normalizeImei(i.imei) === im);

    if (!found) {
      alert("❌ No IMEI tidak ditemukan di stok");
      return;
    }

    if (found.status !== "AVAILABLE") {
      alert("❌ No IMEI tidak tersedia untuk transfer");
      return;
    }

    const allowedStatus = [
      "AVAILABLE",
      "TRANSFER_MASUK",
      "REFUND",
      "PEMBELIAN",
    ];

    if (!allowedStatus.includes(found.status)) {
      alert("❌ No IMEI tidak tersedia untuk transfer");
      return;
    }

    // ❌ DUPLIKAT
    if (form.imeis.includes(found.imei)) {
      alert("⚠️ IMEI sudah ada di daftar");
      return;
    }

    const imeiPending = history.some(
      (trx) =>
        trx.status === "Pending" && (trx.imeis || []).includes(found.imei)
    );

    if (imeiPending) {
      alert("❌ IMEI sedang dalam proses transfer lain");
      return;
    }

    // ✅ FIX UTAMA
    // tokoPengirim tidak berubah
    setForm((f) => ({
      ...f,
      brand: found.namaBrand,
      barang: found.namaBarang,
      kategori: found.kategori,
      imeis: [...f.imeis, found.imei],
      qty: (f.imeis?.length || 0) + 1,
    }));

    setImeiSearch("");
  };

  // ================= VALIDASI MASTER BARANG =================
  const isBarangValidDiMaster = () => {
    if (!form.brand || !form.barang) return false;

    return masterBarang.some(
      (b) =>
        String(b.brand || "")
          .toUpperCase()
          .trim() === String(form.brand).toUpperCase().trim() &&
        String(b.namaBarang || "")
          .toUpperCase()
          .trim() === String(form.barang).toUpperCase().trim()
    );
  };

  const handleTambahTransfer = () => {
    const error = validateForm();
    if (error) {
      alert("❌ " + error);
      return;
    }

    if (!isKategoriImei) {
      if (form.qty > stokTersedia) {
        alert(`❌ Qty melebihi stok tersedia.\nStok tersedia: ${stokTersedia}`);
        return;
      }
    }

    if (!isKategoriImei) {
      const stokTokoIni = stokTersedia;

      if (form.qty > stokTokoIni) {
        alert(
          `❌ Stok tidak mencukupi di toko ${form.tokoPengirim}\n` +
            `Stok tersedia: ${stokTokoIni}`
        );
        return;
      }

      if (stokTokoIni <= 0) {
        alert("❌ Barang tidak tersedia di toko ini");
        return;
      }
    }

    // ================= HARD FINAL DUPLICATE CHECK =================
    const allImeisNow = [
      ...form.imeis,
      ...daftarTransfer.flatMap((i) => i.imeis || []),
    ].map(normalizeImei);

    const uniqueSet = new Set(allImeisNow);

    if (uniqueSet.size !== allImeisNow.length) {
      alert("❌ Terdapat IMEI duplikat. Transfer dibatalkan.");
      return;
    }

    const newItem = {
      ...form,
      id: Date.now(),

      // ✅ SAFE ENGINE v3
      qty: isKategoriImei ? form.imeis?.length || 0 : Number(form.qty || 0),
    };

    const allImeis = [
      ...daftarTransfer.flatMap((i) => i.imeis || []),
      ...(form.imeis || []),
    ];

    const duplicateImeis = allImeis.filter(
      (im, idx) => allImeis.indexOf(im) !== idx
    );

    if (duplicateImeis.length > 0) {
      alert(
        "❌ IMEI tidak boleh duplikat:\n" +
          [...new Set(duplicateImeis)].join(", ")
      );
      return;
    }

    // masuk ke daftar transfer
    setDaftarTransfer((prev) => [...prev, newItem]);

    // reset form supaya bisa input barang berikutnya
    setForm({
      ...initialForm,
      tanggal: form.tanggal,
      noDo: form.noDo,
      noSuratJalan: form.noSuratJalan,
      tokoPengirim: form.tokoPengirim,
      ke: form.ke,
      pengirim: form.pengirim,
    });
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

  const validateForm = () => {
    if (!form.tokoPengirim) return "Toko Pengirim wajib diisi";
    if (!form.ke) return "Toko Tujuan wajib diisi";
    if (!form.pengirim) return "Nama pengirim wajib diisi";
    if (!form.kategori) return "Kategori wajib diisi";
    if (!form.brand) return "Brand wajib diisi";
    if (!form.barang) return "Nama barang wajib diisi";

    if (isKategoriImei && form.imeis.length === 0)
      return "Minimal 1 IMEI harus dimasukkan";

    if (!isKategoriImei && form.qty <= 0) return "Qty wajib diisi";

    if (!isBarangValidDiMaster()) {
      return "Nama Brand atau Nama Barang tidak ada di Master Barang";
    }

    if (
      KATEGORI_WAJIB_IMEI.includes(String(form.kategori || "").toUpperCase()) &&
      (!Array.isArray(form.imeis) || form.imeis.length === 0)
    ) {
      return "Kategori ini wajib menggunakan No IMEI";
    }

    // ================= VALIDASI NON IMEI WAJIB ADA STOK =================
    if (!isKategoriImei) {
      if (stokTersedia <= 0) {
        return `Stok barang ${form.barang} di toko ${form.tokoPengirim} tidak tersedia`;
      }

      if (Number(form.qty) > stokTersedia) {
        return `Qty melebihi stok tersedia (${stokTersedia})`;
      }
    }

    return null; // ⬅️ tetap paling bawah
  };

  // ================= AUTO CLEAN LOCK =================
  const cleanOrphanLock = async (imei) => {
    const invRef = ref(db, `inventory/${form.tokoPengirim}/${imei}`);

    const found = inventory.find((i) => i.imei === imei);
    if (!found) return;

    // Kalau status AVAILABLE tapi masih LOCK → berarti orphan lock
    if (found.status === "AVAILABLE" && found.LOCK_TRANSFER === true) {
      await update(invRef, {
        LOCK_TRANSFER: false,
        TRANSFER_ID: null,
      });
    }
  };

  // ================= SUBMIT TRANSFER (FINAL 100%) =================
  // ================= SUBMIT TRANSFER (FIX 100%) =================
  const submitTransfer = async () => {
    try {
      let transferList = [...daftarTransfer];

      // 🔥 AUTO UNLOCK ORPHAN LOCK
      for (const item of daftarTransfer) {
        for (const imei of item.imeis || []) {
          await cleanOrphanLock(imei);
        }
      }

      for (const item of transferList) {
        for (const im of item.imeis || []) {
          const found = inventory.find(i => normalizeImei(i.imei) === normalizeImei(im));
          console.log("DEBUG INVENTORY IMEI:", found);
        }
      }

      if (form.imeis?.length > 0) {
        for (const imei of form.imeis) {
          await cleanOrphanLock(imei);
        }
      }

      // ==========================================
      // JIKA FORM BELUM MASUK DAFTAR
      // ==========================================
      if (transferList.length === 0) {
        const error = validateForm();
        if (error) {
          alert("❌ " + error);
          return;
        }

        transferList.push({
          ...form,
          id: Date.now(),

          // ✅ FIX IMEI QTY
          qty: Array.isArray(form.imeis)
            ? form.imeis.length
            : Number(form.qty || 0),
        });
      }

      // =====================================
      // CEK DUPLIKAT IMEI GLOBAL
      // =====================================
      const allImeis = transferList.flatMap((i) => i.imeis || []);

      const normalized = allImeis.map(normalizeImei);
      const unique = new Set(normalized);
      
      if (unique.size !== normalized.length) {
        alert("❌ Terdapat IMEI duplikat dalam daftar transfer");
        return;
      }
     

      const uniqueCheck = new Set(allImeis);

      if (uniqueCheck.size !== allImeis.length) {
        alert("❌ Terdapat IMEI duplikat dalam daftar transfer");
        return;
      }

      const duplicateImeis = allImeis.filter(
        (im, idx) => allImeis.indexOf(im) !== idx
      );

      if (duplicateImeis.length > 0) {
        alert(
          "❌ Terdapat IMEI duplikat:\n" +
            [...new Set(duplicateImeis)].join(", ")
        );
        return;
      }

      // =====================================
      // CEK IMEI SEDANG DIPAKAI TRANSFER LAIN
      // =====================================
      const pendingImeis = history
        .filter((r) => r.status === "Pending")
        .flatMap((r) => r.imeis || []);

      const usedImeis = allImeis.filter((im) => pendingImeis.includes(im));

      if (usedImeis.length > 0) {
        alert(
          "❌ IMEI sedang digunakan di transfer lain:\n" +
            [...new Set(usedImeis)].join(", ")
        );
        return;
      }

      // ==========================================
      // VALIDASI PER ITEM (LOGIC LAMA TIDAK DIUBAH)
      // ==========================================
      for (const item of transferList) {
        if (!item.tokoPengirim) return alert("❌ Toko pengirim kosong");

        if (!item.ke) return alert("❌ Toko tujuan kosong");

        if (!item.barang) return alert("❌ Nama barang kosong");

        // ===============================
        // VALIDASI IMEI
        // ===============================
        if (Array.isArray(item.imeis) && item.imeis.length > 0) {
          const invalidImeis = item.imeis.filter((im) => {
            const found = inventory.find((i) => i.imei === im);

            if (!found) return true;
            if (found.status === "SOLD") return true;

            const allowedStatus = [
              "AVAILABLE",
              "REFUND",
              "TRANSFER_MASUK",
              "PEMBELIAN",
              "OUT", // ✅ TAMBAHAN
            ];

            if (!allowedStatus.includes(found.status)) return true;

            return false;
          });

          if (invalidImeis.length > 0) {
            alert(
              "❌ IMEI tidak valid / sudah keluar:\n" + invalidImeis.join(", ")
            );
            return;
          }
        }
      }

      // ==========================================
      // SIMPAN TRANSFER
      // ==========================================
      for (const item of transferList) {
        const transferRef = push(ref(db, "transfer_barang"));
        const transferId = transferRef.key;

        const safeQty =
          Array.isArray(item.imeis) && item.imeis.length > 0
            ? item.imeis.length
            : Number(item.qty || 0);

        await update(transferRef, {
          ...item,
          qty: safeQty, // ✅ SAFE ENGINE V3
          id: transferId,
          status: "Pending",
          createdAt: Date.now(),
        });

        // ======================================
        // LOCK IMEI
        // ======================================
        for (const imei of item.imeis || []) {
          const invRef = ref(db, `inventory/${item.tokoPengirim}/${imei}`);

          // ===============================
          // VALIDASI NON IMEI (WAJIB SESUAI STOK TOKO)
          // ===============================
          if (!Array.isArray(item.imeis) || item.imeis.length === 0) {
            const stokTokoIni = inventoryAccessories.find(
              (i) =>
                i.toko.toUpperCase() === item.tokoPengirim.toUpperCase() &&
                i.namaBrand.toUpperCase() === item.brand.toUpperCase() &&
                i.namaBarang.toUpperCase() === item.barang.toUpperCase()
            );

            const stokReal = stokTokoIni ? Number(stokTokoIni.qty || 0) : 0;

            if (stokReal <= 0) {
              alert(
                `❌ Barang ${item.barang} tidak tersedia di toko ${item.tokoPengirim}`
              );
              return;
            }

            if (Number(item.qty) > stokReal) {
              alert(
                `❌ Qty melebihi stok toko ${item.tokoPengirim}\n` +
                  `Stok tersedia: ${stokReal}`
              );
              return;
            }
          }

          // ✅ FIX AUTO UNLOCK (REFUND / OLD TRANSFER)
          await update(invRef, {
            TRANSFER_ID: null,
            LOCK_TRANSFER: false,
          });

          // LOCK BARU
          await lockImeiTransfer({
            imei,
            transferId,
            tokoAsal: item.tokoPengirim,
          });

          // UPDATE STATUS OUT
          await update(invRef, {
            STATUS: "OUT",
            TRANSFER_ID: transferId,
            UPDATED_AT: Date.now(),
          });
        }
      }

      alert("✅ Transfer masuk tabel & siap di-approve");

      setForm(initialForm);
      setDaftarTransfer([]);
    } catch (err) {
      console.error(err);
      alert("❌ Gagal transfer barang");
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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchByImei(); // 🔥 pakai function di atas
              }
            }}
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

          {/* NAMA PENGIRIM (DARI MASTER KARYAWAN) */}
          <div>
            <label className="text-xs font-semibold">Nama Pengirim</label>
            <input
              list="pengirim-list"
              value={form.pengirim}
              onChange={(e) => setForm({ ...form, pengirim: e.target.value })}
              className="input"
              placeholder="Pilih Karyawan"
            />
            <datalist id="pengirim-list">
              {masterKaryawan.map((k) => (
                <option key={k.id} value={k.NAMA || ""} />
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
                    handleAddImeiAuto(); // 🔥 AUTO MASUK TABLE
                  }
                }}
                className="input"
                placeholder="Scan / ketik IMEI lalu Enter"
              />

              <button onClick={handleAddImeiAuto} className="btn-indigo">
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

        {daftarTransfer.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-indigo-700 mb-2">
              DAFTAR TRANSFER BARANG
            </h3>

            <table className="w-full border text-sm">
              <thead className="bg-indigo-100">
                <tr>
                  <th>No</th>
                  <th>Kategori</th>
                  <th>Brand</th>
                  <th>Barang</th>
                  <th>Qty</th>
                  <th>IMEI</th>
                  <th>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {daftarTransfer.map((item, i) => (
                  <tr key={item.id} className="border-t">
                    <td>{i + 1}</td>
                    <td>{item.kategori}</td>
                    <td>{item.brand}</td>
                    <td>{item.barang}</td>
                    <td>{item.qty}</td>
                    <td>
                      {item.imeis?.length > 0 ? item.imeis.join(", ") : "-"}
                    </td>

                    <td className="flex gap-2">
                      <button
                        onClick={() => handleEditTransfer(i)}
                        className="px-2 py-1 bg-yellow-500 text-white rounded"
                      >
                        EDIT
                      </button>

                      <button
                        onClick={() => handleDeleteTransfer(i)}
                        className="px-2 py-1 bg-red-600 text-white rounded"
                      >
                        DELETE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleTambahTransfer}
            className="btn-indigo flex items-center gap-2"
          >
            <FaPlus /> TAMBAH TRANSFER BARANG
          </button>

          <button
            onClick={submitTransfer}
            disabled={loading}
            className="btn-submit"
          >
            {loading ? "Processing..." : "SUBMIT TRANSFER"}
          </button>
        </div>

        <div id="table-transfer-barang">
          <TableTransferBarang currentRole={currentRole} />
        </div>
      </div>
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
