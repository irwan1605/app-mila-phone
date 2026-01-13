// // src/utils/auth.js
// // Auth & Role helpers via localStorage (tanpa backend)

// const LS_USERS = "users";
// const LS_SESSION = "sessionUser";

// // ===== Users seed (dibuat sekali saat pertama kali app jalan)
// const DEFAULT_USERS = [
//   { id: 1, username: "superadmin", password: "admin123", role: "superadmin" },
//   { id: 2, username: "admin",      password: "admin123", role: "admin" },
//   // contoh PIC
//   { id: 3, username: "pic1",       password: "pic123",   role: "pic_toko1" },
//   { id: 4, username: "pic2",       password: "pic123",   role: "pic_toko2" },
// ];

// export function ensureDefaultUsers() {
//   const raw = localStorage.getItem(LS_USERS);
//   if (!raw) {
//     localStorage.setItem(LS_USERS, JSON.stringify(DEFAULT_USERS));
//   }
// }

// export function getUsers() {
//   ensureDefaultUsers();
//   try {
//     return JSON.parse(localStorage.getItem(LS_USERS)) || [];
//   } catch {
//     return [];
//   }
// }

// export function saveUsers(users) {
//   localStorage.setItem(LS_USERS, JSON.stringify(users || []));
// }

// // ===== Session
// export function getCurrentUser() {
//   try {
//     return JSON.parse(localStorage.getItem(LS_SESSION)) || null;
//   } catch {
//     return null;
//   }
// }

// export function setCurrentUser(u) {
//   if (u) localStorage.setItem(LS_SESSION, JSON.stringify(u));
//   else localStorage.removeItem(LS_SESSION);
// }

// export function logout() {
//   localStorage.removeItem(LS_SESSION);
// }

// // ===== Login
// export function login(username, password) {
//   const users = getUsers();
//   const user = users.find(
//     (u) =>
//       String(u.username).toLowerCase() === String(username).toLowerCase() &&
//       String(u.password) === String(password)
//   );
//   if (!user) return null;
//   setCurrentUser(user);
//   return user;
// }

// // ===== Role utils
// export function isSuperLike(role) {
//   return role === "superadmin" || role === "admin";
// }

// export function getPicTokoId(role) {
//   const m = /^pic_toko(\d+)$/i.exec(role || "");
//   return m ? Number(m[1]) : null;
// }

// export function canAccessToko(role, tokoId) {
//   if (isSuperLike(role)) return true;
//   const picId = getPicTokoId(role);
//   return picId !== null && Number(tokoId) === picId;
// }
