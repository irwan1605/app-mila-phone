// =========================================
// Invoice.jsx — PRO MAX (Full Profesional)
// =========================================

import React, { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import {
  listenPenjualan,
  addPenjualan,
  updatePenjualan,
  deletePenjualan,
} from "../services/FirebaseService";

import "./Invoice.css";

export default function Invoice() {
  const [allData, setAllData] = useState([]);
  const [form, setForm] = useState({});
  const [preview, setPreview] = useState(false);
  const invoiceRef = useRef(null);

  // ============================
  // AUTO BACA DATA PENJUALAN
  // ============================
  useEffect(() => {
    const unsub = listenPenjualan((items) => {
      setAllData(items || []);
    });
    return () => unsub && unsub();
  }, []);

  // ============================
  // AUTO GENERATE INVOICE NUMBER
  // ============================
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
    return `INV-${year}-${seq}`;
  };

  useEffect(() => {
    if (!form.NO_INVOICE) {
      setForm((f) => ({
        ...f,
        NO_INVOICE: generateInvoiceNumber(),
        TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
      }));
    }
  }, []);

  // ============================
  // HANDLE INPUT FORM
  // ============================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // ============================
  // SIMPAN INVOICE KE DATABASE
  // ============================
  const handleSave = async () => {
    if (!form.NO_INVOICE || !form.NAMA_USER || !form.HARGA_UNIT) {
      alert("Isi semua field wajib!");
      return;
    }

    await addPenjualan(form);
    alert("Invoice berhasil disimpan!");
  };

  // ============================
  // QR CODE GENERATION
  // ============================
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (form.NO_INVOICE) {
      QRCode.toDataURL(
        `Invoice:${form.NO_INVOICE}`,
        { width: 200 },
        (err, url) => {
          if (!err) setQrUrl(url);
        }
      );
    }
  }, [form.NO_INVOICE]);

  // ============================
  // EXPORT PDF PROFESSIONAL
  // ============================
  const exportPDF = async () => {
    const element = invoiceRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 3 });
    const img = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(img, "PNG", 0, 0, width, height);
    pdf.save(`${form.NO_INVOICE}.pdf`);
  };

  return (
    <div className="p-4">

      {/* ===================== HEADER ===================== */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white p-4 rounded shadow mb-4">
        <h1 className="text-2xl font-bold">Cetak Invoice — PRO MAX</h1>
        <p className="text-sm opacity-80">Profesional, Rapi, Siap Cetak A4</p>
      </div>

      {/* ===================== FORM INPUT ===================== */}
      <div className="bg-white rounded p-4 shadow mb-4">
        <h2 className="font-bold mb-3">Form Invoice</h2>

        <div className="grid grid-cols-3 gap-3">

          <div>
            <label>No Invoice</label>
            <input
              name="NO_INVOICE"
              className="input"
              value={form.NO_INVOICE || ""}
              readOnly
            />
          </div>

          <div>
            <label>Tanggal</label>
            <input
              type="date"
              name="TANGGAL_TRANSAKSI"
              className="input"
              value={form.TANGGAL_TRANSAKSI || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Nama User</label>
            <input
              name="NAMA_USER"
              className="input"
              value={form.NAMA_USER || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>No HP User</label>
            <input
              name="NO_HP_USER"
              className="input"
              value={form.NO_HP_USER || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Nama Toko</label>
            <input
              name="NAMA_TOKO"
              className="input"
              value={form.NAMA_TOKO || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Nama Brand</label>
            <input
              name="NAMA_BRAND"
              className="input"
              value={form.NAMA_BRAND || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Nama Barang</label>
            <input
              name="NAMA_BARANG"
              className="input"
              value={form.NAMA_BARANG || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Qty</label>
            <input
              type="number"
              name="QTY"
              className="input"
              value={form.QTY || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Harga Unit</label>
            <input
              type="number"
              name="HARGA_UNIT"
              className="input"
              value={form.HARGA_UNIT || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>IMEI / Nomor Unik</label>
            <input
              name="NOMOR_UNIK"
              className="input"
              value={form.NOMOR_UNIK || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Payment Metode</label>
            <input
              name="PAYMENT_METODE"
              className="input"
              value={form.PAYMENT_METODE || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Keterangan</label>
            <input
              name="KETERANGAN"
              className="input"
              value={form.KETERANGAN || ""}
              onChange={handleChange}
            />
          </div>

        </div>

        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Simpan Invoice
        </button>

        <button
          onClick={() => setPreview(true)}
          className="mt-4 ml-2 px-4 py-2 bg-green-600 text-white rounded"
        >
          Preview Invoice
        </button>
      </div>

      {/* ===================== PREVIEW INVOICE ===================== */}
      {preview && (
        <div className="bg-white p-4 rounded shadow">
          <div ref={invoiceRef} className="invoice-a4 shadow p-6">

            {/* HEADER */}
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div>
                <img src="/logoMMT.png" alt="logo" className="h-16" />
                <h2 className="font-bold text-lg mt-2">PT. Mila Media Telekomunikasi</h2>
              </div>

              <div className="text-right">
                <h1 className="text-2xl font-bold">INVOICE</h1>
                <p>No: {form.NO_INVOICE}</p>
                <p>Tanggal: {form.TANGGAL_TRANSAKSI}</p>
              </div>
            </div>

            {/* IDENTITAS */}
            <div className="grid grid-cols-2 mb-4">
              <div>
                <h3 className="font-bold">Kepada:</h3>
                <p>{form.NAMA_USER}</p>
                <p>{form.NO_HP_USER}</p>
              </div>

              <div>
                <h3 className="font-bold">Toko:</h3>
                <p>{form.NAMA_TOKO}</p>
              </div>
            </div>

            {/* TABEL BARANG */}
            <table className="w-full border-collapse mb-4">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border">Barang</th>
                  <th className="p-2 border">Brand</th>
                  <th className="p-2 border">IMEI</th>
                  <th className="p-2 border">Qty</th>
                  <th className="p-2 border">Harga Unit</th>
                  <th className="p-2 border">Total</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td className="p-2 border">{form.NAMA_BARANG}</td>
                  <td className="p-2 border">{form.NAMA_BRAND}</td>
                  <td className="p-2 border">{form.NOMOR_UNIK}</td>
                  <td className="p-2 border">{form.QTY}</td>
                  <td className="p-2 border">Rp {Number(form.HARGA_UNIT || 0).toLocaleString()}</td>
                  <td className="p-2 border">
                    Rp {((form.QTY || 0) * (form.HARGA_UNIT || 0)).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* QR CODE */}
            <div className="mt-6 flex justify-end">
              {qrUrl && <img src={qrUrl} alt="QR" className="h-24" />}
            </div>
          </div>

          {/* BUTTONS */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={exportPDF}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              Export PDF
            </button>

            <button
              onClick={() => setPreview(false)}
              className="px-4 py-2 bg-gray-300 rounded"
            >
              Tutup Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
