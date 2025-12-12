// ============================================
// FormItemSection.jsx — FINAL CLEAN VERSION
// ============================================
import React, { useState, useEffect } from "react";

export default function FormItemSection({
  value,
  onChange,
  onAddRow,
  disabled,
  tahap,
  masterBarang = [],
}) {
  // Bandling state
  const [bandling, setBandling] = useState({
    b1: "",
    h1: 0,
    b2: "",
    h2: 0,
    b3: "",
    h3: 0,
  });

  // Fetch Bundling
  const fetchBandling = (namaBarang) => {
    const found = masterBarang.find((x) => x.NAMA_BARANG === namaBarang);
    if (!found) return;

    setBandling({
      b1: found.bandling1 || "",
      h1: found.hargaBandling1 || 0,
      b2: found.bandling2 || "",
      h2: found.hargaBandling2 || 0,
      b3: found.bandling3 || "",
      h3: found.hargaBandling3 || 0,
    });
  };

  // Trigger bandling otomatis bila kategori cocok
  useEffect(() => {
    value.forEach((itm) => {
      if (
        itm.kategoriBarang === "MOTOR LISTRIK" ||
        itm.kategoriBarang === "SEPEDA LISTRIK"
      ) {
        fetchBandling(itm.namaBarang);
      }
    });
  }, [value]);

  // Fungsi update field item
  const handleItemChange = (id, key, val) => {
    const updated = value.map((item) =>
      item.id === id ? { ...item, [key]: val } : item
    );
    onChange(updated);
  };

  // Tambah item ke cart
  const handleAddItem = (item) => {
    if (disabled) return alert("❌ TAHAP 2 belum aktif.");

    if (!item.kategoriBarang || !item.namaBrand || !item.namaBarang) {
      return alert("Lengkapi kategori, brand, dan nama barang.");
    }

    // IMEI logic
    if (
      ["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"].includes(
        item.kategoriBarang.toUpperCase()
      )
    ) {
      const imeis = (item.imei || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (imeis.length === 0)
        return alert("Kategori ini wajib IMEI, minimal 1 IMEI harus diisi.");

      item.qty = imeis.length;
    }

    onAddRow(item);
  };

  // Ambil harga otomatis
  const getHarga = (brand, barang, tipe) => {
    const found = masterBarang.find(
      (x) => x.NAMA_BRAND === brand && x.NAMA_BARANG === barang
    );
    if (!found) return 0;

    return Number(found[`HARGA_${tipe}`] || 0);
  };

  return (
    <div className="relative">
      <div className="absolute top-1 right-2 text-[11px]">
        {disabled ? (
          <span className="text-red-500">🔒 Tahap 2 Terkunci</span>
        ) : (
          <span className="text-green-600">🟢 Tahap 2 Aktif</span>
        )}
      </div>

      <h2 className="text-sm font-bold mb-2">INPUT BARANG (TAHAP 2)</h2>

      {value.map((item) => (
        <div key={item.id} className="border rounded-xl p-3 bg-white space-y-2">
          {/* KATEGORI */}
          <div>
            <label className="text-xs font-semibold">Kategori *</label>
            <select
              disabled={disabled}
              className="w-full border rounded px-2 py-1 text-sm"
              value={item.kategoriBarang}
              onChange={(e) =>
                handleItemChange(item.id, "kategoriBarang", e.target.value)
              }
            >
              <option value="">-- PILIH --</option>
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
              disabled={disabled}
              className="w-full border rounded px-2 py-1"
              value={item.namaBrand}
              onChange={(e) =>
                handleItemChange(item.id, "namaBrand", e.target.value.toUpperCase())
              }
            />
          </div>

          {/* Nama Barang */}
          <div>
            <label className="text-xs font-semibold">Nama Barang *</label>
            <input
              disabled={disabled}
              className="w-full border rounded px-2 py-1"
              value={item.namaBarang}
              onChange={(e) =>
                handleItemChange(item.id, "namaBarang", e.target.value.toUpperCase())
              }
            />
          </div>

          {/* IMEI */}
          {["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"].includes(
            item.kategoriBarang?.toUpperCase()
          ) && (
            <div>
              <label className="text-xs font-semibold">IMEI / Serial</label>
              <textarea
                disabled={disabled}
                rows={3}
                className="w-full border rounded px-2 py-1 text-sm"
                value={item.imei || ""}
                onChange={(e) => {
                  const arr = e.target.value
                    .split(/\r?\n/)
                    .map((x) => x.trim())
                    .filter(Boolean);
                  handleItemChange(item.id, "imei", e.target.value);
                  handleItemChange(item.id, "qty", arr.length);
                }}
              />
            </div>
          )}

          {/* BANDLING */}
          {(item.kategoriBarang === "MOTOR LISTRIK" ||
            item.kategoriBarang === "SEPEDA LISTRIK") && (
            <div className="border p-2 rounded bg-yellow-50">
              <label className="text-xs font-semibold">Bandling 1</label>
              <input readOnly className="w-full border rounded px-2 py-1" value={bandling.b1} />
              <input readOnly className="w-full border rounded px-2 py-1 mt-1" value={bandling.h1} />

              <label className="text-xs font-semibold mt-2">Bandling 2</label>
              <input readOnly className="w-full border rounded px-2 py-1" value={bandling.b2} />
              <input readOnly className="w-full border rounded px-2 py-1 mt-1" value={bandling.h2} />

              <label className="text-xs font-semibold mt-2">Bandling 3</label>
              <input readOnly className="w-full border rounded px-2 py-1" value={bandling.b3} />
              <input readOnly className="w-full border rounded px-2 py-1 mt-1" value={bandling.h3} />
            </div>
          )}

          {/* Qty untuk accessories */}
          {item.kategoriBarang === "ACCESSORIES" && (
            <div>
              <label className="text-xs font-semibold">Qty *</label>
              <input
                disabled={disabled}
                type="number"
                className="w-full border rounded px-2 py-1"
                value={item.qty}
                onChange={(e) =>
                  handleItemChange(item.id, "qty", Number(e.target.value))
                }
              />
            </div>
          )}

          {/* Harga Unit */}
          <div>
            <label className="text-xs font-semibold">Harga Unit</label>
            <input
              readOnly
              className="w-full border rounded px-2 py-1 bg-gray-100"
              value={item.hargaUnit || 0}
            />
          </div>

          {/* SKEMA HARGA */}
          <div>
            <label className="text-xs font-semibold">Skema Harga *</label>
            <select
              disabled={disabled}
              className="w-full border rounded px-2 py-1"
              value={item.skemaHarga || "SRP"}
              onChange={(e) => {
                const harga = getHarga(item.namaBrand, item.namaBarang, e.target.value);
                handleItemChange(item.id, "skemaHarga", e.target.value);
                handleItemChange(item.id, "hargaUnit", harga);
              }}
            >
              <option value="SRP">SRP</option>
              <option value="GROSIR">GROSIR</option>
              <option value="RESELLER">RESELLER</option>
            </select>
          </div>

          {/* Button Tambah Item */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleAddItem(item)}
            className={`w-full py-2 rounded text-white ${
              disabled ? "bg-gray-300" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            Tambahkan Barang
          </button>
        </div>
      ))}
    </div>
  );
}
