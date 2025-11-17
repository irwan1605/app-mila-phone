// src/App.jsx
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useParams,
} from "react-router-dom";

/* Layout Components */
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

/* Stock pages */
import StockAccessories from "./pages/stock/StockAccessories";
import StockHandphone from "./pages/stock/StockHandphone";
import StockMotorListrik from "./pages/stock/StockMotorListrik";

import StockAccessoriesPusat from "./pages/stock/StockAccessoriesPusat";
import StockHandphonePusat from "./pages/stock/StockHandphonePusat";
import StockMotorListrikPusat from "./pages/stock/StockMotorListrikPusat";

/* Transaksi */
import InputPenjualan from "./pages/InputPenjualan";
import StrukPenjualan from "./pages/StrukPenjualan";
import StrukPenjualanIMEI from "./pages/StrukPenjualanIMEI";
import SuratJalan from "./pages/SuratJalan";
import Invoice from "./pages/Invoice";

import FinanceReportMonthly from "./pages/Reports/FinanceReportMonthly";
import FinanceReport from "./pages/Reports/FinanceReport";

/* Others */
import Sperpar from "./pages/Sperpar";

/* Guards */
import ProtectedRoute from "./components/ProtectedRoute";

/* Firebase Services */
import {
  listenUsers,
  saveUserOnline,
  deleteUserOnline,
  getAllUsersOnce,
} from "./services/FirebaseService";

/* ============================================
      ROLE TOKO VALIDATION
============================================ */
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

/* ============================================
    WRAPPER ROUTE UNTUK DASHBOARD TOKO PER ID
============================================ */
function TokoWrapper({ user }) {
  const { id } = useParams();
  const tokoId = Number(id);

  if (user.role === "superadmin" || user.role === "admin") {
    return <DashboardToko tokoId={tokoId} user={user} />;
  }

  if (user.role?.startsWith("pic_toko")) {
    const allowed = getAllowedTokoIdFromUser(user) ?? 1;

    if (allowed !== tokoId) {
      return <Navigate to={`/toko/${allowed}`} replace />;
    }

    return <DashboardToko tokoId={tokoId} user={user} />;
  }

  return <Navigate to="/dashboard" replace />;
}

/* ============================================
    MAIN APP (Realtime Firebase)
============================================ */
export default function App() {
  /* =============================
      SESSION LOGIN
  ============================= */
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

  /* =============================
      USER LIST (Realtime)
  ============================= */
  const [users, setUsers] = useState([]);

  // Listen realtime user list
  useEffect(() => {
    const unsub = listenUsers((list) => {
      setUsers(list || []);
    });
    return () => unsub && unsub();
  }, []);

  // Add user online
  const addUser = async (data) => {
    try {
      await saveUserOnline(data);
    } catch (err) {
      console.error("Gagal menambahkan user:", err);
    }
  };

  /* ============================================
      RENDER
  ============================================= */
  return (
    <Router>
      {!user ? (
        /* ===============================
            BELUM LOGIN
        =============================== */
        <Routes>
          <Route
            path="/"
            element={<Login onLogin={handleLogin} users={users} />}
          />
          <Route path="/register" element={<Register addUser={addUser} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      ) : (
        /* ===============================
            SUDAH LOGIN
        =============================== */
        <div className="flex h-screen overflow-hidden">
          <Sidebar role={user.role} toko={user.toko} onLogout={handleLogout} />

          <div className="flex-1 flex flex-col min-w-0">
            <Navbar user={user} onLogout={handleLogout} />

            <main className="flex-1 overflow-y-auto p-4">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />

                {/* DASHBOARD PUSAT */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["superadmin", "admin", "pic_toko"]}>
                      <Dashboard user={user} />
                    </ProtectedRoute>
                  }
                />

                {/* DASHBOARD TOKO */}
                <Route
                  path="/toko/:id"
                  element={
                    <ProtectedRoute allowedRoles={["superadmin", "admin", "pic_toko"]}>
                      <TokoWrapper user={user} />
                    </ProtectedRoute>
                  }
                />

                {/* MODULES */}
                <Route path="/user-management" element={<UserManagement />} />
                <Route path="/sales-report" element={<SalesReport />} />
                <Route path="/inventory-report" element={<InventoryReport />} />
                <Route path="/finance-report" element={<FinanceReport />} />
                <Route
                  path="/finance-report-monthly"
                  element={<FinanceReportMonthly />}
                />

                <Route path="/products" element={<Products />} />
                <Route path="/data-management" element={<DataManagement />} />
                <Route
                  path="/transfer-barang-pusat"
                  element={<TransferBarangPusat />}
                />

                <Route
                  path="/service-handphone"
                  element={<ServiceHandphone user={user} />}
                />
                <Route
                  path="/service-motor-listrik"
                  element={<ServiceMotorListrik user={user} />}
                />

                <Route path="/surat-jalan" element={<SuratJalan />} />
                <Route path="/invoice" element={<Invoice />} />
                <Route path="/struk-penjualan" element={<StrukPenjualan />} />
                <Route
                  path="/struk-penjualan-imei"
                  element={<StrukPenjualanIMEI />}
                />

                <Route
                  path="/penjualan-handphone"
                  element={<PenjualanHandphone />}
                />
                <Route
                  path="/penjualan-motor-listrik"
                  element={<PenjualanMotorListrik />}
                />
                <Route path="/input-penjualan" element={<InputPenjualan />} />
                <Route path="/accessories" element={<PenjualanAccessories />} />

                <Route path="/modul-sparepart" element={<Sperpar />} />

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
  );
}
