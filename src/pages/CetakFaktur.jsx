// src/pages/CetakFaktur_PRO_MAX.jsx
import React, { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Use the uploaded logo file path (tool will transform this to a URL in your environment)
const LOGO_PATH = "./logoMMT.jpg";

// Default company profile — edit as needed
const COMPANY = {
  name: "PT. MILA MEDIA TELEKOMUNIKASI",
  address: "Jl. Raya Cibinong No. 18, Bogor",
  phone: "0812-1234-5678",
  email: "admin@milagroup.com",
  website: "www.milagroup.com",
};

function formatCurrency(v) {
  return Number(v || 0).toLocaleString("id-ID");
}

function nextInvoiceNumber(prefix = "INV") {
  const year = new Date().getFullYear();
  const key = `invoice_seq_${year}`;
  const raw = localStorage.getItem(key);
  let seq = raw ? parseInt(raw, 10) : 0;
  seq = seq + 1;
  localStorage.setItem(key, String(seq));
  const padded = String(seq).padStart(5, "0");
  return `${prefix}-${year}-${padded}`;
}

export default function CetakFakturPROMAX() {
  const [form, setForm] = useState({
    nomorFaktur: nextInvoiceNumber("INV"),
    tanggal: new Date().toISOString().slice(0, 10),
    namaToko: "Toko Pusat",
    namaCustomer: "",
    alamatCustomer: "",
    items: [
      { desc: "Contoh Produk A", qty: 1, harga: 0 },
    ],
    note: "",
    tandaTanganName: "",
  });

  const [signatureData, setSignatureData] = useState(null); // dataURL for signature image
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const previewRef = useRef();

  // regenerate QR whenever invoice changes
  useEffect(() => {
    const payload = {
      invoice: form.nomorFaktur,
      toko: form.namaToko,
      total: totalAmount(),
    };
    // dynamic import of qrcode to avoid bundle if not installed
    import("qrcode")
      .then((QR) => QR.toDataURL(JSON.stringify(payload)))
      .then(setQrDataUrl)
      .catch((e) => {
        console.warn("QR generation failed", e);
        setQrDataUrl(null);
      });
  }, [form.nomorFaktur, form.namaToko, form.items]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleItemChange(index, field, value) {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...items[index], [field]: field === "qty" || field === "harga" ? Number(value) : value };
      return { ...f, items };
    });
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { desc: "", qty: 1, harga: 0 }] }));
  }

  function removeItem(i) {
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  }

  function totalAmount() {
    return form.items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.harga || 0), 0);
  }

  function handleSignatureUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSignatureData(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function exportPDF(filename = null) {
    try {
      setLoadingPdf(true);
      const el = previewRef.current;
      if (!el) return;
      // scale up to improve quality
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // compute image size to fit A4 with margins
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth - 20; // 10mm margin each side
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      const outName = filename || `Faktur-${form.nomorFaktur}.pdf`;
      pdf.save(outName);
    } catch (err) {
      console.error("exportPDF error", err);
      alert("Gagal membuat PDF. Cek konsol.");
    } finally {
      setLoadingPdf(false);
    }
  }

  function handleAutoInvoice() {
    const inv = nextInvoiceNumber("INV");
    setForm((f) => ({ ...f, nomorFaktur: inv }));
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Cetak Faktur — PRO MAX</h2>

      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">No Faktur</label>
            <div className="flex gap-2">
              <input name="nomorFaktur" value={form.nomorFaktur} onChange={(e) => setForm((s) => ({ ...s, nomorFaktur: e.target.value }))} className="w-full p-2 border rounded" />
              <button onClick={handleAutoInvoice} className="px-3 py-2 bg-gray-800 text-white rounded">Auto</button>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Tanggal</label>
            <input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm mb-1">Nama Toko</label>
            <input name="namaToko" value={form.namaToko} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block text-sm mb-1">Nama Customer</label>
            <input name="namaCustomer" value={form.namaCustomer} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm mb-1">Alamat Customer</label>
            <input name="alamatCustomer" value={form.alamatCustomer} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          <div className="col-span-3">
            <label className="block text-sm mb-2">Items</label>
            <div className="space-y-2">
              {form.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input className="col-span-6 p-2 border rounded" placeholder="Deskripsi barang" value={it.desc} onChange={(e) => handleItemChange(idx, "desc", e.target.value)} />
                  <input type="number" className="col-span-2 p-2 border rounded" min={1} value={it.qty} onChange={(e) => handleItemChange(idx, "qty", e.target.value)} />
                  <input type="number" className="col-span-3 p-2 border rounded" value={it.harga} onChange={(e) => handleItemChange(idx, "harga", e.target.value)} />
                  <div className="col-span-1">
                    <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => removeItem(idx)}>Del</button>
                  </div>
                </div>
              ))}
              <div>
                <button onClick={addItem} className="px-3 py-2 bg-green-600 text-white rounded">Tambah Item</button>
              </div>
            </div>
          </div>

          <div className="col-span-3">
            <label className="block text-sm mb-1">Catatan</label>
            <textarea name="note" value={form.note} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block text-sm mb-1">Tanda Tangan (upload PNG)</label>
            <input type="file" accept="image/*" onChange={handleSignatureUpload} />
            <input className="mt-2 p-2 border rounded" placeholder="Nama penandatangan" value={form.tandaTanganName} onChange={(e) => setForm((s) => ({ ...s, tandaTanganName: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm mb-1">QR (untuk verifikasi)</label>
            <div className="p-2 border rounded bg-gray-50">
              {qrDataUrl ? <img src={qrDataUrl} alt="QR" style={{ width: 90 }} /> : <div className="text-sm text-gray-400">Generating...</div>}
            </div>
          </div>

          <div className="col-span-3 text-right">
            <div className="inline-block text-left">
              <div className="text-sm text-gray-600">Company</div>
              <div className="font-semibold">{COMPANY.name}</div>
              <div className="text-sm">{COMPANY.address}</div>
              <div className="text-sm">{COMPANY.phone} • {COMPANY.email}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={() => exportPDF()} disabled={loadingPdf} className="px-4 py-2 bg-blue-600 text-white rounded">{loadingPdf ? "Proses..." : "Download PDF"}</button>
          <button onClick={() => window.print()} className="px-4 py-2 border rounded">Print</button>
        </div>
      </div>

      {/* PREVIEW */}
      <div ref={previewRef} id="fakturPreview" className="bg-white p-6 rounded shadow mx-auto max-w-[820px]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <img src={LOGO_PATH} alt="logo" style={{ width: 120, height: "auto", objectFit: "contain" }} />
            <div>
              <div className="font-bold text-lg">{COMPANY.name}</div>
              <div className="text-sm">{COMPANY.address}</div>
              <div className="text-sm">{COMPANY.phone} • {COMPANY.email}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm">No Faktur</div>
            <div className="font-semibold text-lg">{form.nomorFaktur}</div>
            <div className="text-sm mt-2">Tanggal: {form.tanggal}</div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Kepada</div>
            <div className="font-medium">{form.namaCustomer || "-"}</div>
            <div className="text-sm">{form.alamatCustomer}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Dari</div>
            <div className="font-medium">{form.namaToko}</div>
            <div className="text-sm">{COMPANY.name}</div>
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Deskripsi</th>
              <th className="border p-2 text-center">Qty</th>
              <th className="border p-2 text-right">Harga</th>
              <th className="border p-2 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((it, idx) => (
              <tr key={idx}>
                <td className="border p-2">{it.desc || "-"}</td>
                <td className="border p-2 text-center">{it.qty}</td>
                <td className="border p-2 text-right">Rp {formatCurrency(it.harga)}</td>
                <td className="border p-2 text-right">Rp {formatCurrency(it.qty * it.harga)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="border p-2 text-right font-semibold">TOTAL</td>
              <td className="border p-2 text-right font-semibold">Rp {formatCurrency(totalAmount())}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-600">Catatan</div>
            <div className="text-sm">{form.note}</div>
          </div>

          <div className="text-center">
            {signatureData ? (
              <img src={signatureData} alt="signature" style={{ width: 160, height: "auto" }} />
            ) : (
              <div className="text-sm text-gray-400">{form.tandaTanganName || "Tanda tangan kosong"}</div>
            )}
            <div className="text-sm mt-1">{form.tandaTanganName}</div>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">{COMPANY.name} • {COMPANY.address} • {COMPANY.phone}</div>
          <div>{qrDataUrl ? <img src={qrDataUrl} alt="qr" style={{ width: 90 }} /> : null}</div>
        </div>
      </div>
    </div>
  );
}
