export const DB_KEY_USERS = "mgs_users";
export const DB_KEY_SESSION = "mgs_session";


const seedUsersFromScreenshot = () => ([
{ id: 1, name: "Admin CILANGKAP PUSAT", role: "admin", store: "CILANGKAP PUSAT", email: "admin@mgs.id", password: "admin123" },
{ id: 2, name: "User Toko Cabang 1", role: "user", store: "Toko Cabang 1", email: "cabang1@mgs.id", password: "123456" },
{ id: 3, name: "User Toko Cabang 2", role: "user", store: "Toko Cabang 2", email: "cabang2@mgs.id", password: "123456" },
{ id: 4, name: "User Toko Cabang 3", role: "user", store: "Toko Cabang 3", email: "cabang3@mgs.id", password: "123456" },
{ id: 5, name: "User Toko Cabang 4", role: "user", store: "Toko Cabang 4", email: "cabang4@mgs.id", password: "123456" },
{ id: 6, name: "User Toko Cabang 5", role: "user", store: "Toko Cabang 5", email: "cabang5@mgs.id", password: "123456" },
{ id: 7, name: "User Toko Cabang 6", role: "user", store: "Toko Cabang 6", email: "cabang6@mgs.id", password: "123456" },
{ id: 8, name: "User Toko Cabang 7", role: "user", store: "Toko Cabang 7", email: "cabang7@mgs.id", password: "123456" },
{ id: 9, name: "User Toko Cabang 8", role: "user", store: "Toko Cabang 8", email: "cabang8@mgs.id", password: "123456" },
{ id: 10, name: "User Toko Cabang 9", role: "user", store: "Toko Cabang 9", email: "cabang9@mgs.id", password: "123456" },
{ id: 11, name: "User Toko Cabang 10", role: "user", store: "Toko Cabang 10", email: "cabang10@mgs.id", password: "123456" },
]);


export const allStores = [
"CILANGKAP PUSAT",
...Array.from({ length: 10 }, (_, i) => `Toko Cabang ${i + 1}`),
];


export const db = {
getUsers() {
const s = localStorage.getItem(DB_KEY_USERS);
if (!s) return null;
try { return JSON.parse(s); } catch { return null; }
},
saveUsers(list) { localStorage.setItem(DB_KEY_USERS, JSON.stringify(list)); },
ensureSeeded() {
let users = this.getUsers();
if (!users || !Array.isArray(users) || users.length === 0) {
users = seedUsersFromScreenshot();
this.saveUsers(users);
}
return users;
},
setSession(user) { localStorage.setItem(DB_KEY_SESSION, JSON.stringify({ id: user.id, ts: Date.now() })); },
clearSession() { localStorage.removeItem(DB_KEY_SESSION); },
currentUser() {
const session = localStorage.getItem(DB_KEY_SESSION);
if (!session) return null;
try {
const { id } = JSON.parse(session);
const users = this.getUsers() || [];
return users.find(u => u.id === id) || null;
} catch { return null; }
},
};