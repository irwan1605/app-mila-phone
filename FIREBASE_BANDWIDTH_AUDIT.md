# Audit bandwidth Firebase Realtime Database

## Perubahan yang sudah diterapkan

1. Notifikasi Navbar dan Sidebar tidak lagi membaca seluruh `transfer_barang`.
   Keduanya memakai query `orderByChild("status") + equalTo("Pending")`.
2. Navbar tidak lagi membuat atau memainkan `/bell.mp3`.
3. Notifikasi Navbar ditutup secara lokal dengan tombol **OK**. Data transfer tidak
   dihapus atau diubah sehingga alur approval/reject tetap sama.

### Optimasi halaman laporan

- `FirebaseCache` membaca transaksi dengan event incremental per toko. Initial load
  tetap lengkap, sedangkan update berikutnya hanya mengirim transaksi yang berubah.
- Histori `transfer_barang` di cache memakai `child_added`, `child_changed`, dan
  `child_removed`, bukan snapshot root berulang.
- Finance Report tidak lagi memasang listener transaksi kedua yang hasilnya hanya
  dipakai oleh tabel yang sudah dinonaktifkan.
- Summary Pembelian memakai cache transaksi bersama.
- Summary Transfer memakai cache transfer dan transaksi bersama; listener langsung
  pada root `transfer_barang` dan `toko` sudah dihapus.
- Inventory Report dan Sales Report sudah memakai cache bersama. Dua subscription
  di Sales Report tetap dilayani oleh satu koneksi Firebase dari cache.
- Finance Report Monthly hanya memakai state/local storage dan tidak membuat query
  Firebase, sehingga tidak memerlukan perubahan query.

Tambahkan index berikut pada Realtime Database Rules agar query Pending diproses
secara efisien oleh server:

```json
{
  "rules": {
    "transfer_barang": {
      ".indexOn": ["status"]
    },
    "penjualan": {
      ".indexOn": ["TANGGAL_TRANSAKSI"]
    },
    "toko": {
      "$tokoId": {
        "transaksi": {
          ".indexOn": ["TANGGAL_TRANSAKSI"]
        }
      }
    }
  }
}
```

Gabungkan potongan tersebut dengan rules produksi; jangan menimpa aturan akses
yang sudah ada.

## Temuan prioritas

| Prioritas | Lokasi | Pola mahal | Perbaikan aman |
| --- | --- | --- | --- |
| Kritis | `FirebaseService.listenAllTransaksi` | Listener pada root `toko` ikut mengunduh info toko dan seluruh transaksi semua cabang setiap ada perubahan | Untuk layar operasional gunakan `listenTransaksiByTokoHemat`; laporan lintas toko perlu node indeks/denormalisasi khusus per tanggal |
| Kritis | `FirebaseService.listenStockAll` | Listener permanen pada seluruh `detail_stock` | Gunakan node per toko/status atau query indeks yang sesuai layar; cache yang ada sudah mencegah listener duplikat dalam satu tab |
| Tinggi | `listenTransferRequests` dan listener langsung di halaman transfer/report | Membaca seluruh histori transfer secara realtime | Badge sudah diperbaiki; halaman histori sebaiknya memakai query tanggal/`limitToLast` dan tombol muat berikutnya |
| Tinggi | Pemanggilan `get(ref(db, "toko"))` di form/refund | Satu lookup nama/ID mengunduh semua toko beserta child transaksi | Baca `toko/{id}/info`, atau gunakan cache metadata toko yang tidak mencakup transaksi |
| Sedang | Listener master yang sama di beberapa komponen | Snapshot master diunduh ulang per komponen | Pusatkan ke `FirebaseCache` seperti `listenMasterBarangCached` |
| Sedang | Listener tanpa cleanup | `MasterBarangKategoriCard` dan `TableLaporanPenjualan` memasang listener tanpa menyimpan unsubscribe | Return fungsi unsubscribe dari `useEffect` |

## Mengapa biaya terus naik

`onValue` pada lokasi induk mengirim snapshot awal lengkap dan mengirim ulang
snapshot hasil query setiap child berubah. Karena transaksi berada di bawah
`toko/{id}/transaksi`, listener pada `toko` adalah listener terhadap hampir seluruh
database operasional. Filtering dengan `.filter()` setelah snapshot diterima tidak
menghemat bandwidth Firebase.

## Target penghematan

Penghematan 80–95% masuk akal bila mayoritas trafik saat ini berasal dari snapshot
root `toko`, `detail_stock`, dan `transfer_barang`, lalu semua layar memakai rentang
tanggal/limit serta node per toko. Angka tersebut tidak dapat dijamin hanya dari
kode: ukur sebelum/sesudah di Firebase Usage dan Realtime Database Profiler.

Urutan rollout yang aman:

1. Deploy `.indexOn` untuk `status` dan `TANGGAL_TRANSAKSI`.
2. Rilis query Pending yang sudah dibuat dan bandingkan download harian.
3. Migrasikan layar operasional dari `listenAllTransaksi` ke listener per toko.
4. Buat indeks laporan ringkas per tanggal agar laporan tidak membaca histori penuh.
5. Batasi histori transfer/penjualan (misalnya 200 terbaru), dengan pagination untuk data lama.
