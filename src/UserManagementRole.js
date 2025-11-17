// Seed user data (dipakai saat localStorage kosong)
const SEED_USERS = [
    {
      username: "superadmin",
      password: "123",
      name: "Super Admin",
      role: "superadmin",
      toko: null,
    },
    {
      username: "MALVIN VALERIAN",
      password: "123",
      name: "MALVIN VALERIAN1",
      role: "pic_toko1",
      toko: 1,
    },
    {
      username: "PIC TOKO 2",
      password: "123",
      name: "PIC Toko 2",
      role: "pic_toko2",
      toko: 2,
    },
  ];
  
  export default SEED_USERS;
  
  // Helpers umum untuk memastikan konsistensi user
  export const normalizeUser = (u) => {
    const nu = { ...u };
    if (typeof nu.toko === "string" && /^\d+$/.test(nu.toko)) nu.toko = Number(nu.toko);
    if (nu.role?.startsWith("pic_toko") && nu.toko == null) {
      const id = Number(nu.role.replace("pic_toko", "")) || null;
      nu.toko = id;
    }
    if (nu.role === "superadmin") nu.toko = null;
    return nu;
  };
  