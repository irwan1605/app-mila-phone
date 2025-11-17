// src/utils/TokoLabels.js

/**
 * @fileoverview File ini berisi definisi label toko (ID dan Nama)
 * serta fungsi-fungsi helper untuk mempermudah pencarian berdasarkan ID atau Nama.
 */

/**
 * Objek konstan yang memetakan ID toko numerik ke nama toko string.
 * Pastikan ID bersifat unik dan nama toko sesuai dengan format yang diinginkan
 * (misalnya, untuk tampilan atau untuk pembentukan role).
 *
 * @type {Object.<number, string>}
 */
export const TOKO_LABELS = {
    1: "CILANGKAP",
    2: "PONDOK GEDE",
    3: "JATIWARNA",
    4: "KRANGGAN",
    // Anda bisa menambahkan toko lain di sini sesuai kebutuhan
    // Contoh:
    // 5: "DEPOK",
    // 6: "BEKASI",
  };
  
  /**
   * Mencari nama toko berdasarkan ID toko.
   *
   * @param {number} id - ID toko yang ingin dicari namanya.
   * @returns {string} Nama toko jika ditemukan, atau "Unknown" jika ID tidak ada.
   */
  export const findTokoNameById = (id) => {
    return TOKO_LABELS[id] || "Unknown";
  };
  
  /**
   * Mencari ID toko berdasarkan nama toko.
   * Pencarian bersifat case-insensitive dan mengabaikan spasi berlebih.
   *
   * @param {string} name - Nama toko yang ingin dicari ID-nya.
   * @returns {number} ID toko jika ditemukan, atau 1 (ID default) jika nama tidak ada.
   *                   Anda bisa mengubah nilai default ini menjadi `null` atau `undefined`
   *                   jika Anda ingin penanganan error yang lebih eksplisit
   *                   saat nama toko tidak ditemukan.
   */
  export const findTokoIdByName = (name) => {
    const normalizedName = String(name || "").trim().toUpperCase();
    for (const id in TOKO_LABELS) {
      if (TOKO_LABELS[id].toUpperCase() === normalizedName) {
        return Number(id); // Pastikan mengembalikan number
      }
    }
    return 1; // Default ke ID 1 jika nama tidak ditemukan
  };
  
  /**
   * Mengubah nama toko menjadi format yang cocok untuk embedding di role string.
   * Contoh: "PONDOK GEDE" -> "PONDOK_GEDE"
   *
   * @param {string} name - Nama toko yang ingin diformat.
   * @returns {string} Nama toko yang sudah diformat.
   */
  export const formatTokoNameForRole = (name) => {
    return String(name || "").trim().replace(/\s/g, '_').toUpperCase();
  };
  
  /**
   * Mengambil nama toko asli dari string role yang di-embed.
   * Contoh: "pic_tokoPONDOK_GEDE" -> "PONDOK GEDE"
   *
   * @param {string} roleString - String role (misalnya "pic_tokoPONDOK_GEDE").
   * @returns {string|null} Nama toko asli jika berhasil diekstrak, atau null.
   */
  export const getTokoNameFromRoleString = (roleString) => {
    const m = /^pic_toko(.+)$/i.exec(roleString || "");
    if (m && m[1]) {
      return m[1].replace(/_/g, ' '); // Ganti underscore kembali ke spasi
    }
    return null;
  };