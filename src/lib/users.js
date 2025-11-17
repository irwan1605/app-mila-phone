// users.js (dummy data user management)

export const users = [
    {
      id: 1,
      username: "owner",
      password: "123",
      role: "superadmin", // pemilik
      name: "Budi Santoso",
      toko: ["Toko A", "Toko B", "Toko C"], // punya semua toko
    },
    {
      id: 2,
      username: "pic_toko_a",
      password: "123",
      role: "pic",
      name: "Andi Pratama",
      toko: ["Toko A"], // hanya mengelola toko A
    },
    {
      id: 3,
      username: "pic_toko_b",
      password: "123",
      role: "pic",
      name: "Siti Aminah",
      toko: ["Toko B"], // hanya mengelola toko B
    },
    {
      id: 4,
      username: "pic_toko_c",
      password: "123",
      role: "pic",
      name: "Rudi Hartono",
      toko: ["Toko C"], // hanya mengelola toko C
    },
    {
      id: 5,
      username: "staff_a1",
      password: "123",
      role: "staff",
      name: "Dewi Lestari",
      toko: ["Toko A"],
    },
    {
      id: 6,
      username: "staff_b1",
      password: "123",
      role: "staff",
      name: "Agus Salim",
      toko: ["Toko B"],
    },
  ];
  