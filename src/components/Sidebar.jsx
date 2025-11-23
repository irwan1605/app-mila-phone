// =======================
// SIDEBAR.JSX — FINAL PRO MAX
// =======================
import React, { useRef, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import "./Sidebar.css";
import { useGlobalSearch } from "../context/GlobalSearchContext";

import {
  FaHome,
  FaMobileAlt,
  FaMotorcycle,
  FaClipboardList,
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
import { MdBuild } from "react-icons/md";

// =======================
// TOKO LIST (UPDATED + PUSAT)
// =======================
const TOKO_LABELS = {
  0: "PUSAT",
  1: "CILANGKAP",
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

  // =========================
  // GLOBAL SEARCH CONTEXT
  // =========================
  const { searchQuery } = useGlobalSearch();

  const isSuper = role === "superadmin" || role === "admin";
  const picMatch = /^pic_toko(\d+)$/i.exec(role || "");
  const picTokoId = picMatch ? Number(picMatch[1]) : toko ? Number(toko) : null;

  const [showSubMenuDashboardToko, setShowSubMenuDashboardToko] = useState(false);
  const [showSubMenulaporan, setShowSubMenulaporan] = useState(false);
  const [showSubMenuTransferBarang, setShowSubMenuTransferBarang] = useState(false);
  const [showSubMenuCetak, setShowSubMenuCetak] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);
  const panelRef = useRef(null);

  const visibleTokoIds = isSuper ? ALL_TOKO_IDS : picTokoId ? [picTokoId] : [];

  // =================================================================
  // 🔎 AUTO EXPAND SUBMENU BERDASARKAN SEARCH QUERY
  // =================================================================
  useEffect(() => {
    if (!searchQuery) return;

    const q = searchQuery.toLowerCase();

    // Expand Dashboard Toko
    if (Object.values(TOKO_LABELS).some((t) => t.toLowerCase().includes(q))) {
      setShowSubMenuDashboardToko(true);
    }

    // Expand laporan
    if (
      ["laporan", "inventory", "persediaan", "stok", "keuangan", "sales"].some((x) =>
        q.includes(x)
      )
    ) {
      setShowSubMenulaporan(true);
    }

    // Expand Transfer Barang
    if (["transfer", "barang", "kirim"].some((x) => q.includes(x))) {
      setShowSubMenuTransferBarang(true);
    }

    // Expand Cetak Faktur / Invoice
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
      {/* LOGO */}
      <img src="/logoMMT.png" alt="Logo" className="logo mb-1" />

      <div className="font-bold p-1 text-center">
        <h2 className="text-gray-200 text-xs">PT. MILA MEDIA TELEKOMUNIKASI</h2>
        {picTokoId !== null && TOKO_LABELS[picTokoId] && (
          <div className="text-yellow-300 text-xs mt-1">{TOKO_LABELS[picTokoId]}</div>
        )}
      </div>

      <nav className="mt-2 font-bold">

        {/* ======================= SUPER ADMIN ======================= */}
        {isSuper ? (
          <>
            {/* DASHBOARD PUSAT */}
            <Link
              to="/dashboard"
              className={`flex items-center p-3 hover:bg-blue-500 ${
                activePath === "/dashboard" ? "bg-blue-600" : ""
              } ${highlightIfMatch("dashboard pusat")}`}
            >
              <FaHome className="text-xl" />
              <span className="ml-2">DASHBOARD PUSAT</span>
            </Link>

            {/* DASHBOARD TOKO */}
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

            {/* LAPORAN */}
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
                    <span className="ml-2">Penjualan</span>
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
                    <span className="ml-2">Persediaan</span>
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
                    <span className="ml-2">Stok Opname</span>
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
                    <span className="ml-2">Keuangan</span>
                  </Link>
                </li>
              </ul>
            )}

            {/* TRANSFER BARANG */}
            <button
              onClick={() => setShowSubMenuTransferBarang((s) => !s)}
              className={`w-full flex items-center p-3 hover:bg-blue-500 text-left ${highlightIfMatch(
                "transfer barang"
              )}`}
            >
              <FaShoppingCart className="text-xl" />
              <span className="ml-2">TRANSFER BARANG</span>
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
                    <span className="ml-2">Transfer Barang</span>
                  </Link>
                </li>
              </ul>
            )}

            {/* CETAK FAKTUR & INVOICE */}
            <button
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
            )}

            {/* SPAREPART */}
            <Link
              to="/modul-sparepart"
              className={`flex items-center p-3 hover:bg-blue-500 ${
                activePath === "/modul-sparepart" ? "bg-blue-600" : ""
              }`}
            >
              <FaCogs className="text-xl" />
              <span className="ml-2">MODUL SPAREPART</span>
            </Link>

            {/* USER MANAGEMENT */}
            <Link
              to="/user-management"
              className={`flex items-center p-3 hover:bg-blue-500 ${
                activePath === "/user-management" ? "bg-blue-600" : ""
              }`}
            >
              <FaUsers className="text-xl" />
              <span className="ml-2">USER MANAGEMENT</span>
            </Link>

            {/* MASTER DATA */}
            <Link
              to="/data-management"
              className={`flex items-center p-3 hover:bg-blue-500 ${
                activePath === "/data-management" ? "bg-blue-600" : ""
              }`}
            >
              <AiOutlineDatabase className="text-xl" />
              <span className="ml-2">MASTER DATA</span>
            </Link>
          </>
        ) : (
          <>
            {/* PIC TOKO VIEW */}
            <button
              onClick={() => setShowSubMenuDashboardToko((s) => !s)}
              className={`w-full flex items-center p-3 hover:bg-blue-500 text-left`}
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
                        activePath === `/toko/${visibleTokoIds[0]}` ? "bg-blue-600" : ""
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

            {/* SERVICE */}
            <Link
              to="/service-handphone"
              className={`flex items-center p-3 hover:bg-blue-500 ${
                activePath === "/service-handphone" ? "bg-blue-600" : ""
              }`}
            >
              <MdBuild className="text-xl" />
              <span className="ml-2">SERVICE</span>
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
      {/* MOBILE */}
      <div className="lg:hidden sticky top-0 bg-white/70 backdrop-blur border-b z-50">
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

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        ref={panelRef}
        className={`sidebar-panel lg:hidden ${mobileOpen ? "open" : ""}`}
      >
        <div className="bg-blue-700 w-64 h-full text-white flex flex-col">
          <SidebarBody />
        </div>
      </aside>

      {/* DESKTOP */}
      <aside className="hidden lg:flex bg-blue-700 w-64 h-screen sticky top-0 text-white">
        <div className="custom-scroll overflow-y-auto flex-1">
          <SidebarBody />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
