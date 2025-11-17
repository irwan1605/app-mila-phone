// Contoh sederhana untuk halaman yang fetch data dari API
export const revalidate = 10; // Revalidate setiap 10 detik (atau sesuaikan, misalnya 60 untuk 1 menit)

export default async function Page() {
  const res = await fetch('https://api.example.com/data'); // Ganti dengan API Anda
  const data = await res.json();

  return (
    <div>
      <h1>Jadikan Konten Terupdate: {data.title}</h1>
      {/* Tampilkan data */}
    </div>
  );
}