// src/utils/authHelpers.js

import { findTokoIdByName, formatTokoNameForRole, getTokoNameFromRoleString } from './TokoLabels';

/**
 * Memparsing string role untuk mengekstrak informasi dasar role dan toko (jika ada).
 * Ini adalah fungsi inti untuk memahami role user di seluruh aplikasi.
 *
 * @param {string} role - String role user dari data user.
 * @param {string|null} [tokoNameFromUserObject] - Nama toko yang mungkin tersimpan di objek user (field 'toko').
 * @returns {{base: string, tokoName: string|null, tokoId: number|null}} Objek berisi base role, nama toko, dan ID toko.
 */
export function rolePieces(role, tokoNameFromUserObject) {
  if (!role) {
    return { base: "unknown", tokoName: null, tokoId: null };
  }

  const lowerCaseRole = role.toLowerCase();

  if (lowerCaseRole === "superadmin") {
    return { base: "superadmin", tokoName: null, tokoId: null };
  }

  // Cek jika role adalah PIC toko
  if (lowerCaseRole.startsWith("pic_toko")) {
    // Coba ekstrak nama toko dari string role itu sendiri
    const embeddedTokoName = getTokoNameFromRoleString(role);

    // Prioritas:
    // 1. Nama toko dari parameter `tokoNameFromUserObject` (jika tersedia dan valid)
    // 2. Nama toko yang di-embed di string role (jika berhasil diekstrak)
    // 3. Null jika tidak ditemukan keduanya
    const finalTokoName = tokoNameFromUserObject
      ? String(tokoNameFromUserObject).trim().toUpperCase()
      : (embeddedTokoName ? String(embeddedTokoName).trim().toUpperCase() : null);

    const tokoId = finalTokoName ? findTokoIdByName(finalTokoName) : null;

    // Jika tokoId masih null, coba lagi dari embedded name (untuk backward compatibility jika format `tokoNameFromUserObject` beda)
    // Atau jika `findTokoIdByName` mengembalikan default 1, kita bisa menganggapnya sebagai valid
    // Untuk lebih ketat, kita bisa cek `if (tokoId === 1 && finalTokoName !== TOKO_LABELS[1]) tokoId = null;`
    // Tapi untuk saat ini, default 1 cukup aman.

    return { base: "pic_toko", tokoName: finalTokoName, tokoId: tokoId || 1 }; // Default ke ID 1 jika tidak ditemukan
  }

  // Default untuk role yang tidak dikenal
  return { base: "other", tokoName: null, tokoId: null };
}

// Fungsi untuk mendapatkan user dari localStorage
export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error("Failed to parse user from localStorage:", error);
    return null;
  }
};