// src/lib/apiClient.js
export const api = {
    async post(url, body) {
      if (url === "/api/auth/login") {
        const users = JSON.parse(localStorage.getItem("users") || "[]");
        const found = users.find(u => u.username === body.username && u.password === body.password);
        if (!found) throw new Error("Invalid credentials");
        return { data: found };
      }
      if (url === "/api/auth/register") {
        const users = JSON.parse(localStorage.getItem("users") || "[]");
        if (users.some(u => u.username === body.username)) throw new Error("Username exists");
        users.push(body);
        localStorage.setItem("users", JSON.stringify(users));
        return { data: { message: "Registered successfully" } };
      }
      throw new Error("Dummy POST: unknown endpoint");
    },
  
    async get(url) {
      if (url.startsWith("/api/user/list")) {
        return { data: JSON.parse(localStorage.getItem("users") || "[]") };
      }
      if (url.startsWith("/api/toko/")) {
        const id = url.split("/").pop();
        return {
          data: {
            id,
            nama: `Toko ${id}`,
            ringkasan: {
              totalQty: Math.floor(Math.random() * 100),
              totalOmzet: Math.floor(Math.random() * 5_000_000),
              totalGrand: Math.floor(Math.random() * 6_000_000),
            },
          },
        };
      }
      return { data: [] };
    },
  };
  export default api;
  