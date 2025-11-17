// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useParams,
} from "react-router-dom";

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
import TransferBarangPusat from "./pages/Reports/TransferBarangPusat";
import PembelianProdukPusat from "./pages/PembelianProdukPusat";

/* Stock pages (pusat & per toko) */
import StockAccessories from "./pages/stock/StockAccessories";
import StockHandphone from "./pages/stock/StockHandphone";
import StockMotorListrik from "./pages/stock/StockMotorListrik";
import StockAccessoriesPusat from "./pages/stock/StockAccessoriesPusat";
import StockHandphonePusat from "./pages/stock/StockHandphonePusat";
import StockMotorListrikPusat from "./pages/stock/StockMotorListrikPusat";

/* Transaksi / Dokumen */
import InputPenjualan from "./pages/InputPenjualan";
import StrukPenjualan from "./pages/StrukPenjualan";
import StrukPenjualanIMEI from "./pages/StrukPenjualanIMEI";
import SuratJalan from "./pages/SuratJalan";
import Invoice from "./pages/Invoice";

/* Reports */
import FinanceReportMonthly from "./pages/Reports/FinanceReportMonthly";
import FinanceReport from "./pages/Reports/FinanceReport";

/* Others */
import Sperpar from "./pages/Sperpar";

/* Guards */
import ProtectedRoute from "./components/ProtectedRoute";

/* Default users */
import defaultUsers from "./data/UserManagementRole";

/* ===== Util: Ambil toko-id yang diperbolehkan untuk PIC ===== */
function getAllowedTokoIdFromUser(u) {
  if (!u) return null;
  if (u.role === "superadmin" || u.role === "admin") return null; // bebas
  if (u.role?.startsWith("pic_toko")) {
    const fromRole = Number(String(u.role).replace("pic_toko", "")) || null;
    const fromField = Number(u.toko) || null;
    return fromField ?? fromRole ?? 1;
  }
  return null;
}

export default function App() {
  /* ===== Session user ===== */
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => setUser(null);

  /* ===== Sumber data user ===== */
  const [users, setUsers] = useState(() => {
    try {
      const ls = JSON.parse(localStorage.getItem("users"));
      return Array.isArray(ls) && ls.length ? ls : defaultUsers;
    } catch {
      return defaultUsers;
    }
  });

  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users));
  }, [users]);

  const addUser = (newUser) => {
    setUsers((prev) => {
      if (prev.some((u) => u.username === newUser.username)) return prev;
      return [...prev, newUser];
    });
  };

  /* ===== Guard untuk Dashboard Toko (akses per toko) ===== */
  const TokoGuard = ({ id }) => {
    const tokoId = Number(id);

    // Superadmin/admin bebas
    if (user?.role === "superadmin" || user?.role === "admin") {
      return <DashboardToko user={user} tokoId={tokoId} />;
    }

    // PIC toko hanya bisa ke tokonya sendiri
    if (user?.role?.startsWith("pic_toko")) {
      const allowed = getAllowedTokoIdFromUser(user) ?? 1;
      if (allowed !== tokoId)
        return <Navigate to={`/toko/${allowed}`} replace />;
      return <DashboardToko user={user} tokoId={tokoId} />;
    }

    // Selainnya diarahkan ke dashboard utama
    return <Navigate to="/dashboard" replace />;
  };

  const TokoRoute = () => {
    const { id } = useParams();
    return <TokoGuard id={id} />;
  };

  /* ===== Layout utama dengan sidebar dan navbar ===== */
  return (
    <Router>
      {!user ? (
        /* ===== Belum login ===== */
        <Routes>
          <Route path="/" element={<Login onLogin={handleLogin} users={users} />} />
          <Route path="/register" element={<Register addUser={addUser} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      ) : (
        /* ===== Sudah login ===== */
        <div className="flex h-screen overflow-hidden">
          <Sidebar role={user.role} toko={user.toko} onLogout={handleLogout} />
          <div className="flex-1 min-w-0 flex flex-col">
            <Navbar user={user} onLogout={handleLogout} />
            <main className="flex-1 min-w-0 overflow-y-auto p-4">
              <Routes>
                {/* Redirect default */}
                <Route path="/" element={<Navigate to="/dashboard" />} />

                {/* Dashboard utama (pusat) */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["superadmin", "admin", "pic_toko"]}>
                      <Dashboard user={user} />
                    </ProtectedRoute>
                  }
                />

                {/* Dashboard toko (umum: daftar semua toko) */}
                <Route
                  path="/dashboard-toko"
                  element={
                    <ProtectedRoute allowedRoles={["superadmin", "admin", "pic_toko"]}>
                      <DashboardToko user={user} />
                    </ProtectedRoute>
                  }
                />

                {/* Dashboard toko per id */}
                <Route
                  path="/toko/:id"
                  element={
                    <ProtectedRoute allowedRoles={["superadmin", "admin", "pic_toko"]}>
                      <TokoRoute />
                    </ProtectedRoute>
                  }
                />

                {/* Modul lainnya tetap sama */}
                <Route path="/user-management" element={<UserManagement />} />
                <Route path="/sales-report" element={<SalesReport />} />
                <Route path="/inventory-report" element={<InventoryReport />} />
                <Route path="/pembelian-produk-pusat" element={<PembelianProdukPusat />} />
                <Route path="/finance-report" element={<FinanceReport />} />
                <Route path="/finance-report-monthly" element={<FinanceReportMonthly />} />
                <Route path="/products" element={<Products />} />
                <Route path="/data-management" element={<DataManagement />} />
                <Route path="/transfer-barang-pusat" element={<TransferBarangPusat />} />
                <Route path="/service-handphone" element={<ServiceHandphone user={user} />} />
                <Route path="/service-motor-listrik" element={<ServiceMotorListrik user={user} />} />
                <Route path="/surat-jalan" element={<SuratJalan />} />
                <Route path="/invoice" element={<Invoice />} />
                <Route path="/struk-penjualan" element={<StrukPenjualan />} />
                <Route path="/struk-penjualan-imei" element={<StrukPenjualanIMEI />} />
                <Route path="/penjualan-handphone" element={<PenjualanHandphone />} />
                <Route path="/penjualan-motor-listrik" element={<PenjualanMotorListrik />} />
                <Route path="/input-penjualan" element={<InputPenjualan />} />
                <Route path="/accessories" element={<PenjualanAccessories />} />
                <Route path="/modul-sparepart" element={<Sperpar />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
    </Router>
  );
}
