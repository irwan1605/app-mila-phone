import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { listenAllTransaksi } from "../../services/FirebaseService";

const PrintSuratJalan = () => {
  const { invoice } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    const unsub = listenAllTransaksi((rows) => {
      const trx = rows.find((r) => r.invoice === invoice);
      if (trx) setData(trx);
    });
    return () => unsub && unsub();
  }, [invoice]);

  useEffect(() => {
    if (data) {
      setTimeout(() => window.print(), 300);
    }
  }, [data]);

  if (!data) return <div>Loading...</div>;
  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      {/* LOGO */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <img src="/logo-mmt.png" alt="MMT" width={120} />
      </div>

      {/* JUDUL */}
      <h2 style={{ textAlign: "center" }}>SURAT JALAN</h2>

      {/* INFO */}
      <table width="100%" style={{ marginBottom: 20 }}>
        <tbody>
          <tr>
            <td>Nomor Surat Jalan</td>
            <td>: {data.invoice}</td>
          </tr>
          <tr>
            <td>Nama Pengirim</td>
            <td>: {data.user?.namaSales}</td>
          </tr>
          <tr>
            <td>Dari</td>
            <td>: {data.toko}</td>
          </tr>
          <tr>
            <td>Ke</td>
            <td>: {data.tokoTujuan || "-"}</td>
          </tr>
        </tbody>
      </table>

      {/* TABEL BARANG */}
      <table
        width="100%"
        border="1"
        cellPadding="6"
        style={{ borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Barang</th>
            <th>QTY</th>
            <th>IMEI</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it, idx) => (
            <tr key={idx}>
              <td>{idx + 1}</td>
              <td>{it.namaBarang}</td>
              <td>{it.qty || 1}</td>
              <td>{it.imei || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TTD */}
      <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between" }}>
        <div>
          <p>Pengirim</p>
          <br />
          <p>( ___________ )</p>
        </div>
        <div>
          <p>Penerima</p>
          <br />
          <p>( ___________ )</p>
        </div>
      </div>
    </div>
  );
};

export default PrintSuratJalan;
