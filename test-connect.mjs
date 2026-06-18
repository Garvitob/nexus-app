import { createClient } from "@corsair-dev/app";

const corsair = createClient({
  apiKey: "ch_rxa8QsrtnwFkkAdhbpYuwmwCj-vFVVT58fdwLl3DDXo",
});

const tenant = corsair
  .instance("ecc7686c9b9947548ddacaf230872c3c")
  .tenant("user_3FFG4q85iOyyQA6VjtK3tY11fo8");

console.log("=== plugins.credentials keys ===");
console.log(Object.keys(tenant.plugins.credentials || {}));

console.log("\n=== plugins.oauth keys ===");
console.log(Object.keys(tenant.plugins.oauth || {}));

for (const method of ["list", "get", "status"]) {
  console.log(`\n=== plugins.credentials.${method} ===`);
  try {
    const r = await tenant.plugins.credentials[method]?.();
    console.log(JSON.stringify(r, null, 2));
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}

for (const method of ["list", "get", "status"]) {
  console.log(`\n=== plugins.oauth.${method} ===`);
  try {
    const r = await tenant.plugins.oauth[method]?.();
    console.log(JSON.stringify(r, null, 2));
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}