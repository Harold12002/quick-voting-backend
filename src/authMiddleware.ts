import { verify1 } from "../imports.ts";
import { createSecretKey } from "./helpers/loginHelper.ts";



export async function authMiddleware(ctx: any, next: Function) {
    const authHeader = ctx.request.headers.get("Authorization");

    // Check if the Authorization header exists
    if (!authHeader) {
        ctx.response.status = 401;
        ctx.response.body = { error: "Authorization header is missing." };
        return;
    }

    // Extract the token from the header
    const token = authHeader.split(" ")[1]; // Format: "Bearer <token>"
    if (!token) {
        ctx.response.status = 401;
        ctx.response.body = { error: "Token is missing." };
        return;
    }

    try {
        const cryptoKey =  await createSecretKey();
        const payload = await verify1(token, cryptoKey); //decode and validate token

        ctx.state.user = payload;
        await next();
    } catch (error) {
        console.error("Token verification error:", error);
        ctx.response.status = 401;
        ctx.response.body = {error: "Invalid or expired token"}
    }
}
