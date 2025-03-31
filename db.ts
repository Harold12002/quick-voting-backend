import { Client } from "./imports.ts";

export const db = await new Client().connect({
  hostname: Deno.env.get("MYSQLHOST") || "127.0.0.1",
  username: Deno.env.get("MYSQLUSER") || "root",
  db: Deno.env.get("MYSQLDATABASE") || "votesbackend",
  password: Deno.env.get("MYSQLPASSWORD") || "2812",
  port: Number(Deno.env.get("MYSQLPORT")) || 3306,
});
