// ===================================================
// FormItemSection.jsx — FINAL FIX 100%
// Tahap 2 | INPUT BARANG | Manual + IMEI + Bundling
// ===================================================
import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterBarang,
  listenMasterKategoriBarang,
  getImeiDetailByToko,
} from "../../../services/FirebaseService";

/* ================= KONSTANTA ================= */
const KATEGORI_IMEI = ["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"];
const isImeiKategori = (kat) =>
  KATEGORI_IMEI.includes((kat || "").toUpperCase());

export default function FormItemSection({
  value = [],
  onChange,
  tokoLogin,
  allowManual = false,
}) {
  const items = Array.isArray(value) ? value : [];
  const safeOnChange = typeof onChange === "function" ? onChange : () => {};

  const [masterBarang, setMasterBarang] = useState([]);
  const [masterKategori, setMasterKategori] = useState([]);

  /* ================= FIREBASE ================= */
  useEffect(() => {
    const u1 = listenMasterBarang(setMasterBarang);
    const u2 = listenMasterKategoriBarang(setMasterKategori);
    return () => {
      u1 && u1();
      u2 && u2();
    };
  }, []);

  const updateItem = (idx, patch) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    safeOnChange(next);
  };

  /* ================= MEMO ================= */
  const kategoriList = useMemo(
    () => masterKategori.map((k) => k.namaKategori),
    [masterKategori]
  );

  const brandList = (kategori) =>
    [
      ...new Set(
        masterBarang
          .filter((b) => b.kategoriBarang === kategori)
          .map((b) => b.namaBrand || b.brand)
      ),
    ].filter(Boolean);

  const barangList = (kategori, brand) =>
    masterBarang.filter(
      (b) => b.kategoriBarang === kategori && (b.namaBrand || b.brand) === brand
    );

  const subtotalAll = useMemo(
    () =>
      items.reduce(
        (s, i) => s + Number(i.hargaUnit || 0) * Number(i.qty || 0),
        0
      ),
    [items]
  );

  const totalPenjualan = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum + Number(item.qty || 0) * Number(item.hargaUnit || 0),
      0
    );
  }, [items]);

  return (
    <div className={!allowManual ? "opacity-50 pointer-events-none" : ""}>
      {items.map((item, idx) => (
        <div
          key={item.id}
          className="border rounded-xl p-4 mb-4 bg-white space-y-3"
        >
          {/* KATEGORI */}
          <select
            className="w-full border rounded-lg p-2"
            value={item.kategoriBarang}
            onChange={(e) =>
              updateItem(idx, {
                kategoriBarang: e.target.value,
                namaBrand: "",
                namaBarang: "",
                imeiList: [],
                qty: 0,
                isImei: isImeiKategori(e.target.value),
                isBundling: false,
                bundlingItems: [],
              })
            }
          >
            <option value="">-- Pilih Kategori --</option>
            {kategoriList.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>

          {/* BRAND */}
          <select
            className="w-full border rounded-lg p-2"
            disabled={!item.kategoriBarang}
            value={item.namaBrand || ""}
            onChange={(e) =>
              updateItem(idx, {
                namaBrand: e.target.value,
                namaBarang: "",
                isBundling: false,
                bundlingItems: [],
              })
            }
          >
            <option value="">-- Pilih Brand --</option>
            {brandList(item.kategoriBarang).map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>

          {/* BARANG */}
          <select
            className="w-full border rounded-lg p-2"
            disabled={!item.namaBrand}
            value={item.namaBarang || ""}
            onChange={(e) => {
              const b = barangList(item.kategoriBarang, item.namaBrand).find(
                (x) => x.namaBarang === e.target.value
              );
              if (!b) return;

              updateItem(idx, {
                namaBarang: b.namaBarang,
                kategoriBarang: b.kategoriBarang,
                isImei: isImeiKategori(b.kategoriBarang),

                hargaMap: {
                  srp: Number(b.harga?.srp ?? b.HARGA_SRP ?? 0),
                  grosir: Number(b.harga?.grosir ?? b.HARGA_GROSIR ?? 0),
                  reseller: Number(b.harga?.reseller ?? b.HARGA_RESELLER ?? 0),
                },
                skemaHarga: "srp",
                hargaUnit: Number(b.HARGA_SRP || 0),
                qty: isImeiKategori(b.kategoriBarang) ? 0 : 1,

                isBundling:
                  ["MOTOR LISTRIK", "SEPEDA LISTRIK"].includes(
                    b.kategoriBarang
                  ) && b.IS_BUNDLING,
                bundlingItems:
                  ["MOTOR LISTRIK", "SEPEDA LISTRIK"].includes(
                    b.kategoriBarang
                  ) && b.IS_BUNDLING
                    ? b.BUNDLING_ITEMS || []
                    : [],
              });
            }}
          >
            <option value="">-- Pilih Barang --</option>
            {barangList(item.kategoriBarang, item.namaBrand).map((b) => (
              <option key={b.id}>{b.namaBarang}</option>
            ))}
          </select>

          {/* INFO BUNDLING */}
          {item.isBundling && item.bundlingItems?.length > 0 && (
            <div className="bg-yellow-50 border rounded p-2 text-xs">
              <b>📦 Bundling Otomatis:</b>
              <ul className="list-disc pl-4">
                {item.bundlingItems.map((x, i) => (
                  <li key={i}>{x.namaBarang}</li>
                ))}
              </ul>
            </div>
          )}

          {/* KATEGORI HARGA */}
          <select
            className="w-full border rounded-lg p-2 text-sm"
            value={item.skemaHarga || "srp"}
            onChange={(e) =>
              updateItem(idx, {
                skemaHarga: e.target.value,
                hargaUnit: item.hargaMap?.[e.target.value] || 0,
              })
            }
          >
            <option value="srp">
              SRP — Rp {item.hargaMap?.srp?.toLocaleString("id-ID")}
            </option>
            <option value="grosir">
              Grosir — Rp {item.hargaMap?.grosir?.toLocaleString("id-ID")}
            </option>
            <option value="reseller">
              Reseller — Rp {item.hargaMap?.reseller?.toLocaleString("id-ID")}
            </option>
          </select>

          {/* IMEI */}
          {item.isImei && (
            <textarea
              rows={3}
              className="w-full border rounded-lg p-2"
              placeholder="1 IMEI per baris"
              value={(item.imeiList || []).join("\n")}
              onChange={async (e) => {
                const imeiList = e.target.value
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean);

                for (const im of imeiList) {
                  const ok = await getImeiDetailByToko(tokoLogin, im);
                  if (!ok) {
                    alert(`❌ IMEI ${im} bukan milik toko Anda`);
                    return;
                  }
                }

                updateItem(idx, { imeiList, qty: imeiList.length });
              }}
            />
          )}

          {/* QTY */}
          {!item.isImei && (
            <input
              type="number"
              min={1}
              value={item.qty || 1}
              onChange={(e) =>
                updateItem(idx, { qty: Number(e.target.value || 1) })
              }
              className="w-full border rounded-lg px-2 py-1 text-sm"
            />
          )}

          <div className="text-right font-bold text-green-700">
            TOTAL PENJUALAN: Rp {totalPenjualan.toLocaleString("id-ID")}
          </div>
        </div>
      ))}

      <button
        className="btn btn-outline w-full"
        disabled={!allowManual}
        onClick={() =>
          safeOnChange([
            ...items,
            {
              id: Date.now(),
              kategoriBarang: "",
              namaBrand: "",
              namaBarang: "",
              imeiList: [],
              qty: 0,
              hargaUnit: 0,
              isImei: false,
              isBundling: false,
              bundlingItems: [],
            },
          ])
        }
      >
        ➕ Tambah Barang
      </button>
    </div>
  );
}
