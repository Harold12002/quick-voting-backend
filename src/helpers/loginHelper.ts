import { compare, create, verify1 } from "../../imports.ts";

const JWT_SECRET = "your-secret-key";
//cretaesecretKey Function
export async function createSecretKey() {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

//function to create role
export function roleMiddleware(requiredRole: string) {
  return async (ctx: any, next: Function) => {
    const user = ctx.state.user;

    if (!user || user.role !== requiredRole) {
      ctx.response.status = 403;
      ctx.response.body = {
        error: "You are unauthorized to perform this action.",
      };
      return;
    }
    await next();
  };
}

//function to generate a JWT token for admin
export async function generateToken(username: string, role: string) {
  const payLoad = {
    username,
    role,
    exp: Math.floor(Date.now() + 60 * 60 * 100), //EXPIRE IN 1HOUR
  };

  const cryptoKey = await createSecretKey();
  return await create({ alg: "HS256", typ: "JWT" }, payLoad, cryptoKey);
}

// Function to verify a JWT token
export async function verifyToken(token: string) {
  try {
    const cryptoKey = await createSecretKey();
    const payload = await verify1(token, cryptoKey); //decode and validate token
    return { valid: true, payload };
  } catch (error) {
    console.error("Token verification failed:", error);
    return { valid: false };
  }
}

//function to compare plain and hased password
export async function comparePassword(
  password: string,
  hashedPassword: string,
) {
  return await compare(hashedPassword, password);
}

//function to generate token for voting
export async function generateTokenForVote(username: string) {
  const payLoad = {
    username,
    exp: Math.floor(Date.now() + 60 * 60 * 100), //EXPIRE IN 1HOUR
  };

  const cryptoKey = await createSecretKey();
  return await create({ alg: "HS256", typ: "JWT" }, payLoad, cryptoKey);
}
