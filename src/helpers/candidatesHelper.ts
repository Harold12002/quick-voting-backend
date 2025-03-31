import { db } from "../../db.ts";

//getting all candidates
export async function getAllCandidates() {
    const result = await db.query(
        `SELECT id, name, party, position FROM candidates`
    );

    if(Array.isArray(result.rows) && result.rows.length > 0) {
        return result;
    } 
    
}

//deleting candidate
export async function deleteCandidate(name:string, position: string) {
    try{
        const [candidate] = await db.query(
            `SELECT id FROM candidates WHERE name = ? AND position = ?`,
            [name, position]
        );

        if(!candidate) {
            throw new Error("Candidate not found")
        }

        const candidateId = candidate.id;

        await db.query(`DELETE FROM votes WHERE candidate_id = ?`,
            [candidateId]
        );

        const result = await db.query(
            `DELETE FROM candidates where name = ? AND position = ?`,
            [name, position]
        );
        return result;
    } catch (error){
        console.error(error);
    }
}