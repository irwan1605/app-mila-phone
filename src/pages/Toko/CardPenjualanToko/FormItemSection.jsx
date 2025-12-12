// ===================================
// FormItemSection.jsx — FINAL TAHAP 2
// ===================================
import React, { useMemo } from "react";

export default function FormItemSection({
  value,
  onChange,
  onAddRow,
  tahap,
  tahap1Complete,
  masterBarang = [],
}) {
  const disabled = tahap < 2; // 🔒 Kunci TAHAP 2 sebelum TAHAP 1 selesai

  const handleItemChange = (id, key, val) => {
    const updated = value.map((item) =>
      item.id === id ? { ...item, [key]: val } : item
    );
    onChange(updated);
  };

  const handleAddItem = (item) => {
    if (disabled) {
      alert("❌ Lengkapi TAHAP 1 terlebih dahulu.");
      return;
    }

    if (!item.kategoriBarang || !item.namaBrand || !item.namaBarang) {
      alert("Lengkapi kategori, brand, dan nama barang.");
      return;
    }

    // IMEI rules
    const imeis = (item.imei || "")
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);

    // kategori wajib IMEI
    const mustImei = ["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"].includes(
      item.kategoriBarang.toUpperCase()
    );

    if (mustImei) {
      if (imeis.length === 0) {
        alert("Kategori ini wajib IMEI. Minimal 1 IMEI harus diinput.");
        return;
      }
      item.qty = imeis.length; // qty otomatis
    }

    onAddRow(item);
  };

  // harga otomatis dari master barang
  const getHarga = (brand, barang, tipeHarga) => {
    const found = masterBarang.find(
      (x) => x.NAMA_BRAND === brand && x.NAMA_BARANG === barang
    );
    if (!found) return 0;

    if (tipeHarga === "SRP") return Number(found.HARGA_SRP || 0);
    if (tipeHarga === "GROSIR") return Number(found.HARGA_GROSIR || 0);
    if (tipeHarga === "RESELLER") return Number(found.HARGA_RESELLER || 0);

    return Number(found.HARGA_SRP || 0);
  };

  return (
    <div className="relative">
      {/* 🔥 Indikator Tahap 2 */}
      <div className="absolute top-1 right-2 text-[11px] font-semibold">
        {tahap >= 2 ? (
          <span className="text-green-600">🟢 Tahap 2 Aktif</span>
        ) : (
          <span className="text-red-500">🔒 Tahap 2 Terkunci</span>
        )}
      </div>

      <h2 className="font-bold text-slate-700 text-sm mb-2">
        INPUT BARANG (TAHAP 2)
      </h2>

      {value.map((item) => (
        <div
          key={item.id}
          className="border p-3 rounded-xl mb-3 bg-white/70 space-y-2"
        >
          {/* KATEGORI */}
          <div>
            <label className="text-xs font-semibold">Kategori Barang *</label>
            <select
              className="w-full border rounded-lg px-2 py-1 text-sm"
              value={item.kategoriBarang}
              disabled={disabled}
              onChange={(e) =>
                handleItemChange(item.id, "kategoriBarang", e.target.value)
              }
            >
              <option value="">-- PILIH KATEGORI --</option>
              <option value="MOTOR LISTRIK">MOTOR LISTRIK</option>
              <option value="SEPEDA LISTRIK">SEPEDA LISTRIK</option>
              <option value="HANDPHONE">HANDPHONE</option>
              <option value="ACCESSORIES">ACCESSORIES</option>
            </select>
          </div>

          {/* BRAND */}
          <div>
            <label className="text-xs font-semibold">Brand *</label>
            <input
              className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
              disabled={disabled}
              value={item.namaBrand}
              onChange={(e) =>
                handleItemChange(item.id, "namaBrand", e.target.value.toUpperCase())
              }
            />
          </div>

          {/* NAMA BARANG */}
          <div>
            <label className="text-xs font-semibold">Nama Barang *</label>
            <input
              className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
              disabled={disabled}
              value={item.namaBarang}
              onChange={(e) =>
                handleItemChange(item.id, "namaBarang", e.target.value.toUpperCase())
              }
            />
          </div>

          {/* IMEI / SERIAL */}
          {["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"].includes(
            item.kategoriBarang.toUpperCase()
          ) && (
            <div>
              <label className="text-xs font-semibold">
                IMEI / Serial Number (1 IMEI = 1 Unit)
              </label>
              <textarea
                className="w-full border rounded-lg px-2 py-1 text-sm bg-white whitespace-pre"
                rows={3}
                disabled={disabled}
                placeholder="Masukkan 1 IMEI per baris"
                value={item.imei || ""}
                onChange={(e) => {
                  const list = e.target.value
                    .split(/\r?\n/)
                    .map((x) => x.trim())
                    .filter(Boolean);
                  handleItemChange(item.id, "imei", e.target.value);
                  handleItemChange(item.id, "qty", list.length);
                }}
              />
            </div>
          )}

          {/* QTY (manual hanya untuk aksesories) */}
          {item.kategoriBarang.toUpperCase() === "ACCESSORIES" && (
            <div>
              <label className="text-xs font-semibold">Qty *</label>
              <input
                type="number"
                className="w-full border rounded-lg px-2 py-1 text-sm"
                disabled={disabled}
                value={item.qty}
                onChange={(e) =>
                  handleItemChange(item.id, "qty", Number(e.target.value || 0))
                }
              />
            </div>
          )}

          {/* SKEMA HARGA */}
          <div>
            <label className="text-xs font-semibold">Skema Harga *</label>
            <select
              className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
              disabled={disabled}
              value={item.skemaHarga || "SRP"}
              onChange={(e) => {
                const harga = getHarga(
                  item.namaBrand,
                  item.namaBarang,
                  e.target.value
                );
                handleItemChange(item.id, "skemaHarga", e.target.value);
                handleItemChange(item.id, "hargaUnit", harga);
              }}
            >
              <option value="SRP">SRP</option>
              <option value="GROSIR">GROSIR</option>
              <option value="RESELLER">RESELLER</option>
            </select>
          </div>

          {/* HARGA UNIT */}
          <div>
            <label className="text-xs font-semibold">Harga Unit</label>
            <input
              className="w-full border rounded-lg px-2 py-1 text-sm bg-gray-100"
              value={item.hargaUnit}
              readOnly
            />
          </div>

          {/* BUTTON TAMBAH BARANG */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleAddItem(item)}
            className={`w-full py-2 rounded-lg text-white text-sm ${
              disabled
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            Tambahkan Barang
          </button>
        </div>
      ))}
    </div>
  );
}
