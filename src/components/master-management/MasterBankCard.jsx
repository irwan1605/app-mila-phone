// src/components/master-management/MasterBankCard.jsx
import React, { useEffect, useState } from "react";
import {
  listenMasterBank,
  addMasterBank,
  updateMasterBank,
  deleteMasterBank,
  listenMasterPaymentMetode,
} from "../../services/FirebaseService";

export default function MasterBankCard() {
  const [banks, setBanks] = useState([]);
  const [editId, setEditId] = useState(null);
  const [masterPaymentMetode, setMasterPaymentMetode] = useState([]);

  const [form, setForm] = useState({
    namaBank: [], // 🔥 MULTI NAMA
    kodeBank: "",
    jenis: "DEBIT",
  });

  const [tempNama, setTempNama] = useState("");

  /* ================= LOAD ================= */
  useEffect(() => {
    const unsub = listenMasterBank(setBanks);
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = listenMasterPaymentMetode((data) => {
      setMasterPaymentMetode(Array.isArray(data) ? data : []);
    });

    return () => unsub && unsub();
  }, []);

  /* ================= ADD NAMA ================= */
  const addNamaBank = () => {
    if (!tempNama.trim()) return;

    if (form.namaBank.includes(tempNama.trim())) {
      alert("Nama bank sudah ada");
      return;
    }

    setForm({
      ...form,
      namaBank: [...form.namaBank, tempNama.trim()],
    });
    setTempNama("");
  };

  const removeNamaBank = (idx) => {
    setForm({
      ...form,
      namaBank: form.namaBank.filter((_, i) => i !== idx),
    });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    let finalNamaBank = [...form.namaBank];

    // 🔥 AUTO ADD JIKA USER BELUM KLIK +
    if (tempNama.trim()) {
      if (!finalNamaBank.includes(tempNama.trim())) {
        finalNamaBank.push(tempNama.trim());
      }
    }

    if (!finalNamaBank.length || !form.kodeBank) {
      alert("Minimal 1 Nama Bank & Kode wajib diisi");
      return;
    }

    const payload = {
      ...form,
      namaBank: finalNamaBank,
    };

    try {
      if (editId) {
        await updateMasterBank(editId, payload);
      } else {
        await addMasterBank({
          ...payload,
          status: "AKTIF",
          createdAt: Date.now(),
        });
      }

      setForm({ namaBank: [], kodeBank: "", jenis: "DEBIT" });
      setTempNama("");
      setEditId(null);
    } catch (e) {
      alert("Gagal menyimpan data bank");
    }
  };

  const normalizeNamaBank = (namaBank) => {
    if (Array.isArray(namaBank)) return namaBank;
    if (typeof namaBank === "string" && namaBank.trim()) {
      return [namaBank];
    }
    return [];
  };

  const paymentJenisOptions = React.useMemo(() => {
    return [
      ...new Set(
        masterPaymentMetode.flatMap((m) =>
          Array.isArray(m.paymentMetode)
            ? m.paymentMetode
            : m.paymentMetode
            ? [m.paymentMetode]
            : []
        )
      ),
    ];
  }, [masterPaymentMetode]);

  /* ================= RENDER ================= */
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">🏦 MASTER BANK</h2>

      {/* ================= FORM ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {/* NAMA BANK MULTI */}
        <div className="md:col-span-2">
          <div className="flex gap-2">
            <input
              className="border rounded px-2 py-1 w-full"
              placeholder="Tambah Nama Bank"
              value={tempNama}
              onChange={(e) => setTempNama(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNamaBank()}
            />
            <button
              onClick={addNamaBank}
              className="bg-green-600 text-white px-3 rounded"
            >
              +
            </button>
          </div>

          {/* TAG LIST */}
          <div className="flex flex-wrap gap-2 mt-2">
            {form.namaBank.map((n, i) => (
              <span
                key={i}
                className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs flex items-center gap-1"
              >
                {n}
                <button
                  onClick={() => removeNamaBank(i)}
                  className="text-red-500 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <input
          className="border rounded px-2 py-1"
          placeholder="Kode Bank / QRIS"
          value={form.kodeBank}
          onChange={(e) => setForm({ ...form, kodeBank: e.target.value })}
        />

        <select
          className="border rounded px-2 py-1"
          value={form.jenis}
          onChange={(e) => setForm({ ...form, jenis: e.target.value })}
        >
          <option value="">Pilih Jenis</option>

          {paymentJenisOptions.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>

        <button
          onClick={handleSubmit}
          className="bg-indigo-600 text-white rounded px-4 py-1"
        >
          {editId ? "Update" : "Tambah"}
        </button>
      </div>

      {/* ================= TABLE ================= */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">Nama Bank</th>
              <th className="border px-2 py-1">Kode</th>
              <th className="border px-2 py-1">Jenis</th>
              <th className="border px-2 py-1">Status</th>
              <th className="border px-2 py-1">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {banks.map((b) => (
              <tr key={b.id}>
                <td className="border px-2 py-1">
                  {normalizeNamaBank(b.namaBank).join(", ")}
                </td>
                <td className="border px-2 py-1">{b.kodeBank}</td>
                <td className="border px-2 py-1">{b.jenis}</td>
                <td className="border px-2 py-1">{b.status}</td>
                <td className="border px-2 py-1 space-x-2">
                  <button
                    className="text-blue-600"
                    onClick={() => {
                      setForm({
                        namaBank: normalizeNamaBank(b.namaBank),
                        kodeBank: b.kodeBank,
                        jenis: b.jenis,
                      });
                      setEditId(b.id);
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="text-red-600"
                    onClick={() =>
                      window.confirm("Hapus bank?") && deleteMasterBank(b.id)
                    }
                  >
                    Hapus
                  </button>

                  <button
                    className="text-yellow-600"
                    onClick={() =>
                      updateMasterBank(b.id, {
                        status: b.status === "AKTIF" ? "NONAKTIF" : "AKTIF",
                      })
                    }
                  >
                    {b.status === "AKTIF" ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </td>
              </tr>
            ))}

            {!banks.length && (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-3">
                  Belum ada data bank
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
