# Audit bandwidth Firebase Realtime Database

## Perubahan yang sudah diterapkan

1. Notifikasi Navbar dan Sidebar tidak lagi membaca seluruh `transfer_barang`.
   Keduanya memakai query `orderByChild("status") + equalTo("Pending")`.
2. Navbar tidak lagi membuat atau memainkan `/bell.mp3`.
3. Notifikasi Navbar ditutup secara lokal dengan tombol **OK**. Data transfer tidak
   dihapus atau diubah sehingga alur approval/reject tetap sama.
4. Popup Sidebar hanya memilih satu transfer Pending terbaru. Tombol **TUTUP**
   menyimpan signature dan watermark per role/toko di browser, sehingga popup tidak
   muncul lagi setelah render ulang, pindah halaman, refresh, atau transfer terbaru
   berubah menjadi Approved. Update yang benar-benar lebih baru tetap ditampilkan.
5. Listener notifikasi Pending memakai event child incremental. Sesudah initial
   load, Firebase hanya mengirim transfer yang ditambah, diubah, atau dikeluarkan
   dari hasil query Pending—bukan snapshot Pending lengkap setiap kali berubah.

### Optimasi halaman laporan

- `FirebaseCache` membagikan satu listener transaksi dan stok kepada banyak halaman
  dalam tab yang sama. Namun sumber listener tersebut masih memakai snapshot penuh;
  ini tetap menjadi target migrasi berikutnya dan tidak diklaim sudah incremental.
- Finance Report tidak lagi memasang listener transaksi kedua yang hasilnya hanya
  dipakai oleh tabel yang sudah dinonaktifkan.
- Summary Pembelian memakai cache transaksi bersama.
- Beberapa halaman histori masih mempunyai listener langsung pada root
  `transfer_barang`/`toko`; daftar temuan aktual terdapat pada tabel di bawah.
- Inventory Report dan Sales Report sudah memakai cache bersama. Dua subscription
  di Sales Report tetap dilayani oleh satu koneksi Firebase dari cache.
- Finance Report Monthly hanya memakai state/local storage dan tidak membuat query
  Firebase, sehingga tidak memerlukan perubahan query.

### Optimasi autentikasi PIC/SPV

- Hanya `App` yang memasang listener `users` ketika layar login aktif. Listener
  duplikat di komponen Login dan pembacaan penuh `getAllUsersOnce()` sudah dihapus.
- Setelah berhasil login, listener daftar user dihentikan. Halaman User Management
  tetap memiliki listener sendiri dan hanya aktif saat halaman admin dibuka.
- Role `pic_toko{id}` dan `spv_toko{id}`, ID/nama toko lama, session, serta route
  `/toko/{id}` dinormalisasi tanpa mengubah data transaksi.

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
| Kritis | `FirebaseService.listenAllTransaksi` | Listener pada root `toko` ikut mengunduh info toko dan seluruh transaksi semua cabang setiap ada perubahan | Pecah listener per `toko/{id}/transaksi`, lalu gunakan child events atau query tanggal/limit sesuai layar |
| Kritis | `FirebaseService.listenStockAll` | Listener pada seluruh `detail_stock` | Gunakan child events untuk cache lengkap atau node/query per toko/status untuk layar operasional |
| Tinggi | `SummaryTransferReport` | Listener langsung pada root `transfer_barang` dan `toko` | Pindahkan ke cache transfer bersama dan sumber transaksi per toko/incremental |
| Tinggi | `PrintSuratJalan` | Listener root `toko` untuk metadata | Baca/cache node metadata toko terpisah; jangan ikut membaca child transaksi |
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
