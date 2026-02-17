// =======================
// SIDEBAR.JSX — FINAL FIXED (NO UI CHANGES)
// =======================
import React, { useRef, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import "./Sidebar.css";
import { useGlobalSearch } from "../context/GlobalSearchContext";
import FirebaseService from "../services/FirebaseService";

import {
  FaHome,
  FaMotorcycle,
  FaStore,
  FaUsers,
  FaShoppingCart,
  FaMoneyCheckAlt,
  FaCogs,
  FaFileInvoice,
  FaFileAlt,
} from "react-icons/fa";
import { BsGraphUp, BsTagsFill, BsFileEarmarkText } from "react-icons/bs";
import { AiOutlineDatabase } from "react-icons/ai";

const notifSound = new Audio("/notif.mp3");

// =======================
// TOKO LIST (UPDATED + PUSAT)
// =======================
const TOKO_LABELS = {
  1: "CILANGKAP PUSAT",
  2: "CIBINONG",
  3: "GAS ALAM",
  4: "CITEUREUP",
  5: "CIRACAS",
  6: "METLAND 1",
  7: "METLAND 2",
  8: "PITARA",
  9: "KOTA WISATA",
  10: "SAWANGAN",
};

const ALL_TOKO_IDS = Object.keys(TOKO_LABELS).map(Number);

const Sidebar = ({ role, toko, onLogout }) => {
  const location = useLocation();
  const activePath = location.pathname;
  const [transferNotif, setTransferNotif] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState(null);

  const { searchQuery } = useGlobalSearch();

  const isSPV = String(role || "").startsWith("spv_toko");
const isSuper =
  role === "superadmin" ||
  role === "admin" ||
  isSPV;




  const picMatch = /^pic_toko(\d+)$/i.exec(role || "");
  const picTokoId = picMatch ? Number(picMatch[1]) : toko ? Number(toko) : null;

  const [showSubMenuDashboardToko, setShowSubMenuDashboardToko] =
    useState(false);
  const [showSubMenulaporan, setShowSubMenulaporan] = useState(false);
  const [showSubMenuTransferBarang, setShowSubMenuTransferBarang] =
    useState(false);
  const [showSubMenuCetak, setShowSubMenuCetak] = useState(false);
  const [showSubMenuMasterData, setShowSubMenuMasterData] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);

  const panelRef = useRef(null);
  const scrollRefMobile = useRef(null);
  const scrollRefDesktop = useRef(null);
  const listRefMobile = useRef(null);
  const listRefDesktop = useRef(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const role = String(user?.role || "").toLowerCase();
    const tokoId = user?.toko;

    // ✅ Hanya untuk PIC TOKO
    if (!role.startsWith("pic_toko") || !tokoId) return;

    const TOKO_LIST = [
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

    const tokoName = TOKO_LIST[tokoId - 1];

    const unsub = FirebaseService.listenTransferRequests((rows) => {
      const pending = (rows || []).filter(
        (t) =>
          t.status === "Pending" &&
          String(t.ke).toUpperCase() === String(tokoName).toUpperCase()
      );

      // ✅ UPDATE BADGE JUMLAH
      setTransferNotif(pending.length);

      // ✅ POPUP & SUARA JIKA ADA TRANSFER BARU
      if (pending.length > 0) {
        const last = pending[pending.length - 1];

        setPopupData(last);
        setShowPopup(true);

        // ✅ BUNYIKAN SUARA
        notifSound.play().catch(() => {});
      }
    });

    return () => unsub && unsub();
  }, []);

  // ESC Close
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Scroll Glow + Focus Highlight Setup
  useEffect(() => {
    const setupScrollGlow = (el, listEl) => {
      if (!el || !listEl) return () => {};

      let raf = null;

      const applyGlow = () => {
        const max = Math.max(1, el.scrollHeight - el.clientHeight);
        const top = el.scrollTop;
        const t = Math.min(1, Math.max(0, top / max));

        const topOpacity = top > 0 ? 0.35 : 0.0;
        const bottomOpacity = top < max ? 0.35 : 0.0;

        const hueTop = 200 + 100 * t;
        const hueBottom = 170 + 50 * t;

        el.style.setProperty("--glowTopOpacity", String(topOpacity));
        el.style.setProperty("--glowBottomOpacity", String(bottomOpacity));
        el.style.setProperty("--glowHueTop", String(hueTop));
        el.style.setProperty("--glowHueBottom", String(hueBottom));
      };

      const onScroll = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          applyGlow();
        });
      };

      const ro = new ResizeObserver(() => applyGlow());
      el.addEventListener("scroll", onScroll, { passive: true });
      ro.observe(el);
      applyGlow();

      const io = new IntersectionObserver(
        (entries) => {
          listEl
            .querySelectorAll(".in-focus")
            .forEach((n) => n.classList.remove("in-focus"));

          const best = entries.reduce(
            (acc, e) =>
              e.intersectionRatio > (acc?.intersectionRatio ?? 0) ? e : acc,
            null
          );

          if (best?.isIntersecting) {
            const item = best.target.closest("a,button,li");
            item?.classList?.add("in-focus");
          }
        },
        {
          root: el,
          threshold: [0.25, 0.5, 0.75],
          rootMargin: "-25% 0% -25% 0%",
        }
      );

      listEl.querySelectorAll("a, button").forEach((n) => io.observe(n));

      return () => {
        el.removeEventListener("scroll", onScroll);
        ro.disconnect();
        io.disconnect();
        if (raf) cancelAnimationFrame(raf);
      };
    };

    const cleanups = [];

    if (scrollRefDesktop.current && listRefDesktop.current) {
      cleanups.push(
        setupScrollGlow(scrollRefDesktop.current, listRefDesktop.current)
      );
    }

    if (scrollRefMobile.current && listRefMobile.current) {
      cleanups.push(
        setupScrollGlow(scrollRefMobile.current, listRefMobile.current)
      );
    }

    return () => cleanups.forEach((fn) => fn && fn());
  }, []);

  // ===========================
  // FIXED: Auto Focus (inside useEffect, NOT conditional outside)
  // ===========================
  useEffect(() => {
    if (!mobileOpen || !panelRef.current) return;

    const firstFocusable = panelRef.current.querySelector(
      "a,button,input,select"
    );
    firstFocusable?.focus();
  }, [mobileOpen]);

  const visibleTokoIds = isSuper ? ALL_TOKO_IDS : picTokoId ? [picTokoId] : [];

  // Auto Expand by Search
  useEffect(() => {
    if (!searchQuery) return;

    const q = searchQuery.toLowerCase();

    if (Object.values(TOKO_LABELS).some((t) => t.toLowerCase().includes(q))) {
      setShowSubMenuDashboardToko(true);
    }

    if (
      ["laporan", "inventory", "persediaan", "stok", "keuangan", "sales"].some(
        (x) => q.includes(x)
      )
    ) {
      setShowSubMenulaporan(true);
    }

    if (["transfer", "barang", "kirim"].some((x) => q.includes(x))) {
      setShowSubMenuTransferBarang(true);
    }

    if (["invoice", "faktur", "print"].some((x) => q.includes(x))) {
      setShowSubMenuCetak(true);
    }
  }, [searchQuery]);

  const highlightIfMatch = (label) => {
    if (!searchQuery) return "";
    return label.toLowerCase().includes(searchQuery.toLowerCase())
      ? "highlight-search"
      : "";
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("user");
    } finally {
      if (typeof onLogout === "function") onLogout();
    }
  };

  // ===========================
  // SIDEBAR BODY
  // ===========================
  const SidebarBody = () => (
    <>
      <img src="/logoMMT.png" alt="Logo" className="logo mb-1 " />

      <div className="font-bold p-1 text-center">
        <h2 className="text-gray-200 text-xs">PT. MILA MEDIA TELEKOMUNIKASI</h2>
        {picTokoId !== null && TOKO_LABELS[picTokoId] && (
          <div className="text-yellow-300 text-xs mt-1">
            {TOKO_LABELS[picTokoId]}
          </div>
        )}
      </div>

      <nav className="mt-2 font-bold">
        {isSuper ? (
          <>
            <Link
              to="/dashboard"
              className={`flex items-center p-3 hover:bg-blue-500 ${
                activePath === "/dashboard" ? "bg-blue-600" : ""
              } ${highlightIfMatch("dashboard pusat")}`}
            >
              <FaHome className="text-xl" />
              <span className="ml-2">DASHBOARD PUSAT</span>
            </Link>

            <button
              onClick={() => setShowSubMenuDashboardToko((s) => !s)}
              className={`w-full flex items-center p-3 hover:bg-blue-500 text-left ${highlightIfMatch(
                "dashboard toko"
              )}`}
            >
              <FaStore className="text-xl" />
              <span className="ml-2">DASHBOARD TOKO</span>
            </button>

            {showSubMenuDashboardToko && (
              <ul className="pl-6">
                {visibleTokoIds.map((id) => (
                  <li key={id}>
                    <Link
                      to={`/toko/${id}`}
                      className={`flex items-center p-2 hover:bg-blue-500 ${
                        activePath === `/toko/${id}` ? "bg-blue-600" : ""
                      } ${highlightIfMatch(TOKO_LABELS[id])}`}
                    >
                      <FaStore className="text-sm" />
                      <span className="ml-2">{TOKO_LABELS[id]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* PEMBELIAN (EX MASTER PEMBELIAN) */}
            {!isSPV && (
              <Link
                to="/master-pembelian"
                className={`flex items-center p-3 hover:bg-blue-500 ${
                  activePath === "/master-pembelian" ? "bg-blue-600" : ""
                }${highlightIfMatch("pembelian")}`}
              >
                <FaShoppingCart className="text-xl" />
                <span className="ml-2">PEMBELIAN</span>
              </Link>
            )}

            {!isSPV && (
              <>
                <button
                  onClick={() => setShowSubMenuMasterData((s) => !s)}
                  className={`w-full flex items-center p-3 hover:bg-blue-500 text-left ${
                    activePath.includes("/data-management") ||
                    activePath.includes("/master-barang")
                      ? "bg-blue-600"
                      : ""
                  }`}
                >
                  <AiOutlineDatabase className="text-xl" />
                  <span className="ml-2">MASTER DATA</span>
                </button>

                {showSubMenuMasterData && (
                  <ul className="pl-6">
                    <li>
                      <Link
                        to="/master-barang"
                        className={`flex items-center p-2 hover:bg-blue-500 ${
                          activePath === "/master-barang" ? "bg-blue-600" : ""
                        }`}
                      >
                        <AiOutlineDatabase className="text-sm" />
                        <span className="ml-2">Master Barang</span>
                      </Link>
                    </li>

                    <li>
                      <Link
                        to="/master-payment"
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center p-2 hover:bg-blue-500 ${
                          activePath === "/master-penjualan"
                            ? "bg-blue-600"
                            : ""
                        }`}
                      >
                        <AiOutlineDatabase className="text-sm" />
                        <span className="ml-2">Master Payment</span>
                      </Link>
                    </li>

                    <li>
                      <Link
                        to="/master-karyawan"
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center p-2 hover:bg-blue-500 ${
                          activePath === "/master-karyawan" ? "bg-blue-600" : ""
                        }`}
                      >
                        <AiOutlineDatabase className="text-sm" />
                        <span className="ml-2">Master Karyawan</span>
                      </Link>
                    </li>

                    <li>
                      <Link
                        to="/data-management"
                        className={`flex items-center p-2 hover:bg-blue-500 ${
                          activePath === "/data-management" ? "bg-blue-600" : ""
                        }`}
                      >
                        <AiOutlineDatabase className="text-sm" />
                        <span className="ml-2">Master Management</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </>
            )}

            <button
              onClick={() => setShowSubMenulaporan((s) => !s)}
              className={`w-full flex items-center p-3 hover:bg-blue-500 text-left ${highlightIfMatch(
                "laporan"
              )}`}
            >
              <BsFileEarmarkText className="text-xl" />
              <span className="ml-2">LAPORAN</span>
            </button>

            {showSubMenulaporan && (
              <ul className="pl-6">
                <li>
                  <Link
                    to="/sales-report"
                    className={`flex items-center p-2 hover:bg-blue-500 ${
                      activePath === "/sales-report" ? "bg-blue-600" : ""
                    }`}
                  >
                    <BsGraphUp className="text-lg" />
                    <span className="ml-2">Laporan Penjualan</span>
                  </Link>
                </li>

                <li>
                  <Link
                    to="/laporan-retur"
                    className={`flex items-center p-2 hover:bg-blue-500 ${
                      activePath === "/laporan-retur" ? "bg-blue-600" : ""
                    }`}
                  >
                    <BsGraphUp className="text-lg" />
                    <span className="ml-2"> 🔄 Laporan Retur</span>
                  </Link>
                </li>

                <li>
                  <Link
                    to="/inventory-report"
                    className={`flex items-center p-2 hover:bg-blue-500 ${
                      activePath === "/inventory-report" ? "bg-blue-600" : ""
                    }`}
                  >
                    <BsTagsFill className="text-lg" />
                    <span className="ml-2">Laporan Persediaan</span>
                  </Link>
                </li>

                <li>
                  <Link
                    to="/stok-opname"
                    className={`flex items-center p-2 hover:bg-blue-500 ${
                      activePath === "/stok-opname" ? "bg-blue-600" : ""
                    }`}
                  >
                    <AiOutlineDatabase className="text-lg" />
                    <span className="ml-2">Laporan Stok Opname</span>
                  </Link>
                </li>

                <li>
                  <Link
                    to="/finance-report"
                    className={`flex items-center p-2 hover:bg-blue-500 ${
                      activePath === "/finance-report" ? "bg-blue-600" : ""
                    }`}
                  >
                    <FaMoneyCheckAlt className="text-lg" />
                    <span className="ml-2">Laporan Keuangan</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/laporan-summary-transfer"
                    className="flex items-center p-2 hover:bg-blue-500"
                  >
                    📦 <span className="ml-2">Summary Transfer Barang</span>
                  </Link>
                </li>

                <li>
                  <Link
                    to="/laporan-summary-pembelian"
                    className="flex items-center p-2 hover:bg-blue-500"
                  >
                    🧾 <span className="ml-2">Summary Pembelian</span>
                  </Link>
                </li>
              </ul>
            )}

            <button
              onClick={() => setShowSubMenuTransferBarang((s) => !s)}
              className={`w-full flex items-center p-3 hover:bg-blue-500 text-left ${highlightIfMatch(
                "transfer barang"
              )}`}
            >
              <FaShoppingCart className="text-xl" />
              <span className="ml-2">TRANSFER GUDANG</span>
            </button>

            {showSubMenuTransferBarang && (
              <ul className="pl-6">
                <li>
                  <Link
                    to="/transfer-barang"
                    className={`flex items-center p-2 hover:bg-blue-500 ${
                      activePath === "/transfer-barang" ? "bg-blue-600" : ""
                    }`}
                  >
                    <FaMotorcycle className="text-lg" />
                    <span className="ml-2">Transfer Gudang</span>
                  </Link>
                </li>
              </ul>
            )}

            {/* <button
              onClick={() => setShowSubMenuCetak((s) => !s)}
              className={`w-full flex items-center p-3 hover:bg-blue-500 text-left ${highlightIfMatch(
                "cetak"
              )}`}
            >
              <FaFileInvoice className="text-xl" />
              <span className="ml-2">CETAK DOKUMEN</span>
            </button>

            {showSubMenuCetak && (
              <ul className="pl-6">
                <li>
                  <Link
                    to="/cetak-faktur"
                    className={`flex items-center p-2 hover:bg-blue-500 ${
                      activePath === "/cetak-faktur" ? "bg-blue-600" : ""
                    }`}
                  >
                    <FaFileAlt className="text-lg" />
                    <span className="ml-2">Cetak Faktur</span>
                  </Link>
                </li>

                <li>
                  <Link
                    to="/invoice"
                    className={`flex items-center p-2 hover:bg-blue-500 ${
                      activePath === "/invoice" ? "bg-blue-600" : ""
                    }`}
                  >
                    <FaFileInvoice className="text-lg" />
                    <span className="ml-2">Cetak Invoice</span>
                  </Link>
                </li>
              </ul>
            )} */}

            {/* <Link
              to="/modul-sparepart"
              className={`flex items-center p-3 hover:bg-blue-500 ${
                activePath === "/modul-sparepart" ? "bg-blue-600" : ""
              }`}
            >
              <FaCogs className="text-xl" />
              <span className="ml-2">MODUL SPAREPART</span>
            </Link> */}

            {!isSPV && (
              <Link
                to="/user-management"
                className={`flex items-center p-3 hover:bg-blue-500 ${
                  activePath === "/user-management" ? "bg-blue-600" : ""
                }`}
              >
                <FaUsers className="text-xl" />
                <span className="ml-2">USER MANAGEMENT</span>
              </Link>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => setShowSubMenuDashboardToko((s) => !s)}
              className="w-full flex items-center p-3 hover:bg-blue-500 text-left"
            >
              <FaStore className="text-xl" />
              <span className="ml-2">DASHBOARD TOKO</span>
            </button>

            {showSubMenuDashboardToko && (
              <ul className="pl-6">
                {visibleTokoIds.length === 1 ? (
                  <li>
                    <Link
                      to={`/toko/${visibleTokoIds[0]}`}
                      className={`flex items-center p-2 hover:bg-blue-500 ${
                        activePath === `/toko/${visibleTokoIds[0]}`
                          ? "bg-blue-600"
                          : ""
                      }`}
                    >
                      <FaStore className="text-sm" />
                      <span className="ml-2">
                        {TOKO_LABELS[visibleTokoIds[0]]}
                      </span>
                    </Link>
                  </li>
                ) : (
                  <li className="text-xs p-2">Akun PIC belum terhubung</li>
                )}
              </ul>
            )}

            {/* 2️⃣ LAPORAN PENJUALAN TOKO SENDIRI */}
            <Link
              to="/sales-report"
              state={{ onlyMyToko: true }}
              className="flex items-center p-3 hover:bg-blue-500"
            >
              <BsGraphUp className="text-xl" />
              <span className="ml-2">LAPORAN PENJUALAN</span>
            </Link>

            {/* 3️⃣ LAPORAN STOK TOKO SENDIRI */}
            <Link
              to="/inventory-report"
              state={{ onlyMyToko: true }}
              className="flex items-center p-3 hover:bg-blue-500"
            >
              <BsTagsFill className="text-xl" />
              <span className="ml-2">LAPORAN PERSEDIAAN</span>
            </Link>

            <Link
              to="/stok-opname"
              state={{
                onlyMyToko: true,
                tokoId: picTokoId,
              }}
              className={`flex items-center p-2 hover:bg-blue-500 ${
                activePath === "/stok-opname" ? "bg-blue-600" : ""
              }`}
            >
              <AiOutlineDatabase className="text-lg" />
              <span className="ml-2">Laporan Stok Opname</span>
            </Link>

            {/* 4️⃣ TRANSFER GUDANG TOKO SENDIRI (REALTIME LOGIN PIC) */}
            <Link
              to="/transfer-barang"
              state={{
                onlyMyToko: true,
                tokoId: picTokoId,
              }}
              className="flex items-center p-3 hover:bg-blue-500 relative"
            >
              <AiOutlineDatabase className="text-xl" />
              <span className="ml-2 font-bold">TRANSFER GUDANG</span>

              {transferNotif > 0 && (
                <span className="absolute right-3 top-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                  {transferNotif}
                </span>
              )}
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 mt-auto">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={18} className="logout-icon" />
          <span>Keluar</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* TOP BAR (Mobile) */}
      <div className="lg:hidden sticky top-0 z-[60] bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="h-12 flex items-center justify-between px-3">
          <button
            aria-label="Buka menu"
            className="hamburger-btn"
            onClick={() => setMobileOpen(true)}
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
          <div className="text-sm font-semibold text-slate-700">Menu</div>
          <div className="w-8" />
        </div>
      </div>

      {/* OVERLAY (Mobile) */}
      <div
        className={`sidebar-overlay lg:hidden ${mobileOpen ? "show" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* PANEL (Mobile) */}
      <aside
        ref={panelRef}
        className={`sidebar-panel lg:hidden ${mobileOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigasi"
      >
        <div className="bg-blue-700 w-64 h-full text-white flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <span className="font-semibold">Navigasi</span>
            <button
              className="close-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Tutup menu"
            >
              ✕
            </button>
          </div>

          <div
            ref={scrollRefMobile}
            className="custom-scroll overflow-y-auto flex-1"
          >
            <div ref={listRefMobile} className="px-0">
              <SidebarBody />
            </div>
          </div>
        </div>
      </aside>

      {/* SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex bg-blue-700 w-64 h-screen sticky top-0 text-white z-40">
        <div
          ref={scrollRefDesktop}
          className="custom-scroll overflow-y-auto flex flex-col w-full"
        >
          <div ref={listRefDesktop}>
            <SidebarBody />
          </div>
        </div>
      </aside>
      {/* ================= POPUP NOTIFIKASI TRANSFER PIC ================= */}
      {showPopup && popupData && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 rounded-xl shadow-2xl w-72 animate-bounce">
          <div className="font-bold text-sm mb-1">📦 TRANSFER BARU MASUK!</div>
          <div className="text-xs">
            <div>
              <b>Dari:</b> {popupData.dari}
            </div>
            <div>
              <b>Barang:</b> {popupData.barang}
            </div>
          </div>

          <button
            onClick={() => setShowPopup(false)}
            className="mt-2 w-full bg-white text-indigo-700 py-1 rounded text-xs font-bold hover:bg-indigo-100"
          >
            TUTUP
          </button>
        </div>
      )}
    </>
  );
};

export default Sidebar;
