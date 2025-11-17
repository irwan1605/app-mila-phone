export async function getDataByToko(tokoName) {
    const response = await fetch("/database.json");
    const data = await response.json();
  
    // contoh: data["GAS ALAM"]
    return data[tokoName] || [];
  }
  