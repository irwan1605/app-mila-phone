import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  listenTransferRequests,
  createTransferRequest,
  updateTransferRequest,
  transferStock,
} from "../../services/FirebaseService";
import {
  FaArrowRight,
  FaSave,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

/*
  ✅ CardTransferGudangToko.jsx
  - Transfer stok antar toko
  - Filter otomatis TOKO pengirim dari route
  - Status: PENDING → APPROVED → VOID
  - APPROVED otomatis pindah stok
  - VOID otomatis rollback stok
*/

export default function CardTransferGudangToko() {
  const { tokoId } = useParams();

  const finalTokoName = tokoId
    ? tokoId.replace(/-/g, " ").toUpperCase()
    : "CILANGKAP PUSAT";

  const [requests, setRequests] = useState([]);

  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    tokoAsal: finalTokoName,
    tokoTujuan: "",
    namaBarang: "",
    qty: "",
    keterangan: "",
  });

  // ================= LISTENER =================
  useEffect(() => {
    if (typeof listenTransferRequests === "function") {
      const unsub = listenTransferRequests((list = []) => {
        const filtered = list.filter(
          (r) =>
            r.tokoAsal === finalTokoName ||
            r.tokoTujuan === finalTokoName
        );
        setRequests(filtered);
      });
      return () => unsub && unsub();
    }
  }, [finalTokoName]);

  // ================= HELPER =================
  const handle = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ================= SUBMIT =================
  const handleSubmit = async () => {
    if (!form.tokoTujuan || !form.namaBarang || !form.qty) {
      alert("Lengkapi data transfer.");
      return;
    }

    const payload = {
      ...form,
      qty: Number(form.qty || 0),
      status: "PENDING",
      createdAt: Date.now(),
    };

    try {
      await createTransferRequest(payload);
      setForm({
        tanggal: new Date().toISOString().slice(0, 10),
        tokoAsal: finalTokoName,
        tokoTujuan: "",
        namaBarang: "",
        qty: "",
        keterangan: "",
      });
      alert("Permintaan transfer dibuat.");
    } catch (err) {
      console.error(err);
      alert("Gagal membuat transfer.");
    }
  };

  // ================= APPROVE =================
  const handleApprove = async (row) => {
    if (!window.confirm("Approve & pindahkan stok?")) return;

    try {
      // pindahkan stok fisik
      await transferStock(
        row.tokoAsal,
        row.tokoTujuan,
        row.namaBarang,
        row.qty
      );

      // update status
      await updateTransferRequest(row.id, {
        status: "APPROVED",
        approvedAt: Date.now(),
      });
    } catch (err) {
      console.error(err);
      alert("Gagal approve transfer.");
    }
  };

  // ================= VOID =================
  const handleVoid = async (row) => {
    if (!window.confirm("VOID transfer?")) return;

    try {
      // rollback jika sudah approved
      if (row.status === "APPROVED") {
        await transferStock(
          row.tokoTujuan,
          row.tokoAsal,
          row.namaBarang,
          row.qty
        );
      }

      await updateTransferRequest(row.id, {
        status: "VOID",
        voidAt: Date.now(),
      });
    } catch (err) {
      console.error(err);
      alert("Gagal VOID transfer.");
    }
  };

  // ================= KLASIFIKASI =================
  const outgoing = useMemo(
    () => requests.filter((r) => r.tokoAsal === finalTokoName),
    [requests, finalTokoName]
  );

  const incoming = useMemo(
    () => requests.filter((r) => r.tokoTujuan === finalTokoName),
    [requests, finalTokoName]
  );

  // ================= RENDER =================
  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">
        Transfer Gudang — {finalTokoName}
      </h1>

      {/* ================= FORM TRANSFER ================= */}
      <div className="bg-white p-4 rounded-xl shadow grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <input
          type="date"
          value={form.tanggal}
          onChange={(e) => handle("tanggal", e.target.value)}
          className="border p-2 rounded"
        />

        <input
          value={form.tokoAsal}
          readOnly
          className="border p-2 rounded bg-gray-100"
        />

        <input
          placeholder="Toko Tujuan"
          value={form.tokoTujuan}
          onChange={(e) => handle("tokoTujuan", e.target.value)}
          className="border p-2 rounded"
        />

        <input
          placeholder="Nama Barang"
          value={form.namaBarang}
          onChange={(e) => handle("namaBarang", e.target.value)}
          className="border p-2 rounded"
        />

        <input
          type="number"
          placeholder="QTY"
          value={form.qty}
          onChange={(e) => handle("qty", e.target.value)}
          className="border p-2 rounded"
        />

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            className="bg-indigo-600 text-white px-3 py-2 rounded flex items-center gap-1"
          >
            <FaSave /> Kirim
          </button>

          <button
            onClick={() =>
              setForm((f) => ({
                ...f,
                tokoTujuan: "",
                namaBarang: "",
                qty: "",
                keterangan: "",
              }))
            }
            className="border px-3 py-2 rounded"
          >
            <FaTimes /> Reset
          </button>
        </div>
      </div>

      {/* ================= TRANSFER KELUAR ================= */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          Transfer Keluar <FaArrowRight />
        </h2>

        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 border">Tanggal</th>
              <th className="p-2 border">Tujuan</th>
              <th className="p-2 border">Barang</th>
              <th className="p-2 border">QTY</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {outgoing.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Belum ada transfer keluar.
                </td>
              </tr>
            )}

            {outgoing.map((r) => (
              <tr key={r.id}>
                <td className="p-2 border">{r.tanggal}</td>
                <td className="p-2 border">{r.tokoTujuan}</td>
                <td className="p-2 border">{r.namaBarang}</td>
                <td className="p-2 border text-center">{r.qty}</td>
                <td className="p-2 border">{r.status}</td>
                <td className="p-2 border text-center flex justify-center gap-2">
                  {r.status === "PENDING" && (
                    <button
                      onClick={() => handleApprove(r)}
                      className="text-green-600"
                    >
                      <FaSave />
                    </button>
                  )}

                  <button
                    onClick={() => handleVoid(r)}
                    className="text-red-600"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= TRANSFER MASUK ================= */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="font-semibold mb-3">Transfer Masuk</h2>

        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 border">Tanggal</th>
              <th className="p-2 border">Asal</th>
              <th className="p-2 border">Barang</th>
              <th className="p-2 border">QTY</th>
              <th className="p-2 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {incoming.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Belum ada transfer masuk.
                </td>
              </tr>
            )}

            {incoming.map((r) => (
              <tr key={r.id}>
                <td className="p-2 border">{r.tanggal}</td>
                <td className="p-2 border">{r.tokoAsal}</td>
                <td className="p-2 border">{r.namaBarang}</td>
                <td className="p-2 border text-center">{r.qty}</td>
                <td className="p-2 border">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
