import { db } from "../../db.ts";

//getting results
export async function getAllResults() {
    const result = await db.query(
        `Select * from votes`
    );
    return result;
}
