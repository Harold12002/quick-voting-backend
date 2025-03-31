import { db } from "../../db.ts";
import { hash } from "../../imports.ts";

//function to hash password
export async function hashPassword(password: string) {
    return await hash(password);
}

//function to delete user
export async function deleteUser(username: string) {
    try{
        const result = await db.execute(
            `DELETE FROM users where username = ?`,
            [username]
        );
        return result;
    } catch (error){
        console.error("Error deleting user", error);
        throw error;
    }
}
