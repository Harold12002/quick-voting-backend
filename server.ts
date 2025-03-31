import { Application } from "./imports.ts";
import routes from "./src/routes/routes.ts";

const PORT = Number(Deno.env.get("PORT")) || 8000;

// Setting up Oak application
const app = new Application();

// Router middleware
app.use(routes.routes());
app.use(routes.allowedMethods());

// Default root route
app.use((ctx) => {
  ctx.response.body = "Exam Hive Backend";
});

console.log(`Server running on http://localhost:${PORT}`);
await app.listen({ port: PORT });
