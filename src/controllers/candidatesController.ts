import { db } from "../../db.ts";
import { deleteCandidate } from "../helpers/candidatesHelper.ts";

export class CandidatesController{

    //Admin insert candidates
    async addCandidates(ctx: any) {
        try{
            const body = await ctx.request.body.json();
            const {name, party, position} = body;

            //validate input
            if(!name || !party || !position) {
                ctx.response.status = 400;
                ctx.response.body = {error: "Invalid input, fill in all fields"};
                return;
            }

            //validate user role
            const user = ctx.state.user;
            if(!user || user.role !== "Admin") {
                ctx.response.status = 403;
                ctx.response.body = {message: "Only authorized users can add candidates. "};
                return;
            }

            //checking if candidate already exixts
            const result = await db.query(
                `SELECT * FROM candidates WHERE name = ? AND position = ?`,
                [name, position]
            );

            if(result.length > 0) {
                ctx.response.status = 409;
                ctx.response.body = {message: "Candidate already exists"};
            }

            //inserting candidates
            await db.query(
                `INSERT INTO candidates (name, party, position) VALUES (?, ?, ?)`,
                [name, party, position]
            );
            ctx.response.status = 201;
            ctx.response.body = {message: "Candidate added successfully"};

        } catch {
            ctx.response.status = 500;
            ctx.response.body = {message: "Error adding candidate."}
        }
    }

// Getting all candidates
async getCandidates(ctx: any) {
    try {
        const result = await db.query(`SELECT * FROM candidates`);
        

        if (result && result.length > 0) {
            ctx.response.status = 200;
            ctx.response.body = result; // Send the array directly
        } else {
            ctx.response.status = 404;
            ctx.response.body = { message: `No candidates found` };
        }
    } catch (error) {
        console.error('Database error:', error); // Log the exact error
        ctx.response.status = 500;
        ctx.response.body = { error: `Failed to retrieve candidates` };
    }
}

    //Admin delete candidate
    async removeCandidate(ctx:any) {
        try{
            const body = await ctx.request.body.json();
            const {name, position} = body;

            //validate input
            if(!name || !position) {
                ctx.response.status = 400;
                ctx.response.body = {error: "Provide name and position to delete. "};
                return;
            }

            //validate user role
            const user = ctx.state.user;
            if(!user || user.role !== "Admin") {
                ctx.response.status = 403;
                ctx.response.body = {error: "Access Denied. Authorized users only. "};
                return;
            }

            const candidateDeleted = await deleteCandidate(name, position);

            if(candidateDeleted) {
                ctx.response.status = 200;
                ctx.response.body = {error: "Candidate successfully deleted. "};
                return;
            } else {
                ctx.response.status = 404;
                ctx.response.body = {error: "Candidate not found. "};
            }
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = {error: "Internal server error"};
            return;
        }
    }
}