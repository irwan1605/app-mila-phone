// src/App.jsx
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useParams,
} from "react-router-dom";


/* Layout */
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";


/* Pages */
import Dashboard from "./pages/Dashboard";
import DashboardToko from "./pages/DashboardToko";
import Products from "./pages/Products";
import SalesReport from "./pages/Reports/SalesReport";
import InventoryReport from "./pages/Reports/InventoryReport";
import UserManagement from "./pages/UserManagement";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ServiceHandphone from "./pages/ServiceHandphone";
import ServiceMotorListrik from "./pages/ServiceMotorListrik";
import PenjualanHandphone from "./pages/PenjualanHandphone";
import PenjualanMotorListrik from "./pages/PenjualanMotorListrik";
import PenjualanAccessories from "./pages/PenjualanAccessories";
import DataManagement from "./pages/DataManagement";
import StockAccessories from "./pages/stock/StockAccessories";
import StockHandphone from "./pages/stock/StockHandphone";
import StockMotorListrik from "./pages/stock/StockMotorListrik";
import StockAccessoriesPusat from "./pages/stock/StockAccessoriesPusat";
import StockHandphonePusat from "./pages/stock/StockHandphonePusat";
import StockMotorListrikPusat from "./pages/stock/StockMotorListrikPusat";
import InputPenjualan from "./pages/InputPenjualan";
import StrukPenjualan from "./pages/StrukPenjualan";
import StrukPenjualanIMEI from "./pages/StrukPenjualanIMEI";
import SuratJalan from "./pages/SuratJalan";
import Invoice from "./pages/Invoice";
import FinanceReportMonthly from "./pages/Reports/FinanceReportMonthly";
import FinanceReport from "./pages/Reports/FinanceReport";
import Sperpart from "./pages/Sperpart";
import { GlobalSearchProvider } from "./context/GlobalSearchContext";

import StockOpname from "./pages/StockOpname";

/* ✨ Fitur Baru — Transfer Barang */
import TransferBarang from "./pages/TransferBarang";

/* ✨ Halaman Baru — Cetak Faktur */
import CetakFaktur from "./pages/CetakFaktur";

/* Guards */
import ProtectedRoute from "./components/ProtectedRoute";

/* Firebase sync (Mode 3 Penjualan realtime) */
import { listenUsers, getAllUsersOnce } from "./services/FirebaseService";

/* Default local users (fallback login offline) */
import defaultUsers from "./data/UserManagementRole";
import MasterBarang from "./pages/MasterBarang";
import MasterPembelian from "./pages/MasterPembelian";
import MasterPayment from "./pages/MasterPayment";
import MasterKaryawan from "./pages/MasterKaryawan";
import CardPenjualanToko from "./pages/Toko/CardPenjualanToko/CardPenjualanToko";
import CardStockOpnameToko from "./pages/Toko/CardStockOpnameToko";
import CardTransferGudangToko from "./pages/Toko/CardTransferGudangToko";

/* ===========================
    Utility role → toko
=========================== */
function getAllowedTokoIdFromUser(u) {
  if (!u) return null;
  if (u.role === "superadmin" || u.role === "admin") return null;

  if (u.role?.startsWith("pic_toko")) {
    const roleId = Number(String(u.role).replace("pic_toko", "")) || null;
    const fieldId = Number(u.toko) || null;
    return fieldId ?? roleId ?? 1;
  }
  return null;
}

/* ===========================
   Wrapper Dashboard Toko
=========================== */
function TokoWrapper({ user }) {
  const { id } = useParams();
  const tokoId = Number(id);

  if (user.role === "superadmin" || user.role === "admin")
    return <DashboardToko tokoId={tokoId} user={user} />;

  if (user.role?.startsWith("pic_toko")) {
    const allowed = getAllowedTokoIdFromUser(user) ?? 1;
    if (allowed !== tokoId) return <Navigate to={`/toko/${allowed}`} replace />;
    return <DashboardToko tokoId={tokoId} user={user} />;
  }

  return <Navigate to="/dashboard" replace />;
}

/* ===========================
            MAIN APP
=========================== */
export default function App() {
  /* Session user */
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  /* Realtime Firebase Users */
  const [users, setUsers] = useState(defaultUsers);

 

  useEffect(() => {
    getAllUsersOnce().then((u) => {
      if (u?.length) setUsers(u);
    });

    const unsub = listenUsers((list) => {
      if (list?.length) setUsers(list);
    });

    return () => unsub && unsub();
  }, []);

  /* persist login session */
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => setUser(null);

  return (
    <GlobalSearchProvider>
      <Router>
        {!user ? (
          /* ======================== LOGIN MODE ========================= */
          <Routes>
            <Route
              path="/"
              element={<Login onLogin={handleLogin} users={users} />}
            />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        ) : (
          /* ======================== LOGGED IN MODE ===================== */
          <div className="flex h-screen overflow-hidden">
            <Sidebar
              role={user.role}
              toko={user.toko}
              onLogout={handleLogout}
            />

            <div className="flex-1 flex flex-col min-w-0">
              <Navbar user={user} onLogout={handleLogout} />

              <main className="flex-1 overflow-y-auto p-4">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" />} />

                  {/* Dashboard pusat realtime */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute
                        allowedRoles={["superadmin", "admin", "pic_toko"]}
                      >
                        <Dashboard user={user} />
                      </ProtectedRoute>
                    }
                  />

                  {/* Dashboard Toko - Realtime per toko */}
                  <Route
                    path="/toko/:id"
                    element={
                      <ProtectedRoute
                        allowedRoles={["superadmin", "admin", "pic_toko"]}
                      >
                        <TokoWrapper user={user} />
                      </ProtectedRoute>
                    }
                  />

                  {/* Modul per toko */}
                  <Route
                    path="/toko/:tokoId/penjualan"
                    element={<CardPenjualanToko />}
                  />
                  <Route
                    path="/toko/:tokoId/stock-opname"
                    element={<CardStockOpnameToko />}
                  />
                  <Route
                    path="/toko/:tokoId/transfer-gudang"
                    element={<CardTransferGudangToko />}
                  />

                  {/* Management User */}
                  <Route path="/user-management" element={<UserManagement />} />

                  {/* Reports */}
                  <Route path="/sales-report" element={<SalesReport />} />
                  <Route
                    path="/inventory-report"
                    element={<InventoryReport />}
                  />
                  <Route path="/finance-report" element={<FinanceReport />} />
                  <Route
                    path="/finance-report-monthly"
                    element={<FinanceReportMonthly />}
                  />
                  <Route path="/stok-opname" element={<StockOpname />} />
                  <Route path="/master-barang" element={<MasterBarang />} />
                  <Route
                    path="/master-pembelian"
                    element={<MasterPembelian />}
                  />
                  {/* Master Penjualan – BARU */}
                  <Route path="/master-payment" element={<MasterPayment />} />
                  <Route path="/master-karyawan" element={<MasterKaryawan />} />

                  {/* Produk */}
                  <Route path="/products" element={<Products />} />

                  {/* MASTER MANAGEMENT */}
                  <Route path="/data-management" element={<DataManagement />} />

                  {/* PRINT */}

                  {/* <Route path="/print/sales" element={<PrintSalesReport />} />
                  <Route path="/print/inventory" element={<PrintInventory />} />
                  <Route
                    path="/print/stock-opname"
                    element={<PrintStockOpname />}
                  />
                  <Route path="/print/keuangan" element={<PrintKeuangan />} />
                  <Route
                    path="/print/surat-jalan/:invoice"
                    element={<PrintSuratJalan />}
                  /> */}

                  {/* Surat Jalan, Faktur, Invoice, Struk */}
                  <Route path="/surat-jalan" element={<SuratJalan />} />

                  {/* Cetak Faktur PRO MAX (halaman khusus) */}
                  <Route path="/cetak-faktur" element={<CetakFaktur />} />

                  {/* Invoice PRO MAX (utama) */}
                  <Route path="/invoice" element={<Invoice />} />

                  {/* Alias tambahan untuk mode PRO & Preview */}
                  <Route path="/invoice-pro" element={<Invoice />} />
                  <Route path="/invoice-preview" element={<Invoice />} />

                  <Route path="/struk-penjualan" element={<StrukPenjualan />} />
                  <Route
                    path="/struk-penjualan-imei"
                    element={<StrukPenjualanIMEI />}
                  />

                  {/* Service */}
                  <Route
                    path="/service-handphone"
                    element={<ServiceHandphone user={user} />}
                  />
                  <Route
                    path="/service-motor-listrik"
                    element={<ServiceMotorListrik user={user} />}
                  />

                  {/* Penjualan */}
                  <Route
                    path="/penjualan-handphone"
                    element={<PenjualanHandphone />}
                  />
                  <Route
                    path="/penjualan-motor-listrik"
                    element={<PenjualanMotorListrik />}
                  />
                  <Route
                    path="/accessories"
                    element={<PenjualanAccessories />}
                  />
                  <Route path="/input-penjualan" element={<InputPenjualan />} />

                  {/* Sparepart */}
                  <Route path="/modul-sparepart" element={<Sperpart />} />

                  {/* ✨ Fitur Baru — Transfer Barang */}
                  <Route path="/transfer-barang" element={<TransferBarang />} />

                  {/* Stok */}
                  <Route
                    path="/stock-accessories"
                    element={<StockAccessories />}
                  />
                  <Route path="/stock-handphone" element={<StockHandphone />} />
                  <Route
                    path="/stock-motor-listrik"
                    element={<StockMotorListrik />}
                  />

                  <Route
                    path="/stock-accessories-pusat"
                    element={<StockAccessoriesPusat />}
                  />
                  <Route
                    path="/stock-handphone-pusat"
                    element={<StockHandphonePusat />}
                  />
                  <Route
                    path="/stock-motor-listrik-pusat"
                    element={<StockMotorListrikPusat />}
                  />

                  {/* Fallback */}
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </main>
            </div>
          </div>
        )}
      </Router>
    </GlobalSearchProvider>
  );
}
