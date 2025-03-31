import { db } from "../../db.ts";

export class VotingController {
  //casting a vote
  async castVote(ctx: any) {
    try {
      const body = await ctx.request.body.json();
      const { candidate_id, username } = body;

      // Validate input
      if (!candidate_id || !username) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Candidate ID and username are required" };
        return;
      }

      // Check if the user already voted
      const result = await db.query(
        `SELECT has_voted FROM users WHERE username = ?`,
        [username],
      );

      if (result.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "User not found" };
        return;
      }

      const { has_voted } = result[0];
      if (has_voted) {
        ctx.response.status = 403;
        ctx.response.body = { error: "You have already cast your vote." };
        return;
      }

      // Check if the candidate exists
      const candidateResult = await db.query(
        `SELECT * FROM candidates WHERE id = ?`,
        [candidate_id],
      );

      if (candidateResult.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Candidate not found" };
        return;
      }

      // Start transaction to prevent race conditions
      await db.execute("START TRANSACTION");

      try {
        // Increment the candidate vote count
        const voteUpdateResult = await db.execute(
          `UPDATE votes SET votes_count = votes_count + 1 WHERE candidate_id = ?`,
          [candidate_id],
        );

        // If no rows were updated, it means the candidate_id doesn't exist in the `votes` table
        if (voteUpdateResult.affectedRows === 0) {
          // Insert a new row for the candidate
          await db.execute(
            `INSERT INTO votes (candidate_id, votes_count) VALUES (?, 1)`,
            [candidate_id],
          );
        }

        // Mark user as having voted
        await db.execute(
          `UPDATE users SET has_voted = 1 WHERE username = ?`,
          [username],
        );

        // Commit transaction
        await db.execute("COMMIT");

        ctx.response.status = 200;
        ctx.response.body = {
          message: "Your vote has been cast successfully.",
        };
      } catch (error) {
        console.error("Error during vote update:", error);

        // Rollback transaction in case of error
        await db.execute("ROLLBACK");

        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
      }
    } catch (error) {
      console.error("Error during voting:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Internal server error" };
    }
  }

  //getting vote count for a candidate
  async getVotesForCandidate(ctx: any) {
    try {
      const candidateId = ctx.params.id;

      // Validate input
      if (!candidateId) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid candidate ID" };
        return;
      }

      // Fetch the vote record for the specified candidate
      const voteRecord = await db.query(
        `SELECT candidate_id, votes_count FROM votes WHERE candidate_id = ?`,
        [candidateId],
      );

      if (voteRecord.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Candidate not found in votes table" };
        return;
      }

      // Extract the vote details
      const { candidate_id, votes_count } = voteRecord[0];

      // Return the vote count for the candidate
      ctx.response.status = 200;
      ctx.response.body = {
        candidate_id: candidate_id,
        votes_count: votes_count,
      };
    } catch (error) {
      console.error("Error fetching votes:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Internal server error" };
    }
  }

  //getting results
  async getResults(ctx: any) {
    try {
      // Fetch candidates and their votes along with additional details
      const results = await db.query(
        `SELECT 
                    c.id AS candidate_id, 
                    c.name AS candidate_name, 
                    c.party AS party, 
                    c.position AS position, 
                    v.votes_count AS votes_count 
                 FROM candidates c
                 LEFT JOIN votes v ON c.id = v.candidate_id`,
      );

      // Fetch the total number of votes
      const totalResult = await db.query(
        `SELECT SUM(votes_count) as total_votes FROM votes;`,
      );

      const totalVotes = Number(totalResult[0]?.total_votes || 0);

      // Calculate percentage and determine the winner
      let winner = {
        candidate_id: null,
        name: null,
        percentage: 0,
      };

      const candidates = results.map((row: any) => {
        const candidateVotes = Number(row.votes_count || 0);
        const percentage = totalVotes > 0
          ? (candidateVotes / totalVotes) * 100
          : 0;

        // Determine the winner
        if (percentage > winner.percentage) {
          winner = {
            candidate_id: row.candidate_id,
            name: row.candidate_name,
            percentage: parseFloat(percentage.toFixed(2)),
          };
        }

        return {
          candidate_id: row.candidate_id,
          name: row.candidate_name,
          party: row.party,
          position: row.position,
          votes_count: candidateVotes,
          percentage: parseFloat(percentage.toFixed(2)),
        };
      });

      // Respond with the results
      ctx.response.status = 200;
      ctx.response.body = {
        total_votes: totalVotes,
        candidates: candidates,
        winner: winner,
      };
    } catch (error) {
      console.error("Error fetching results:", error);
      ctx.response.status = 500;
      ctx.response.body = { message: "Internal server error." };
    }
  }

  //Admin resetting everything
  async reset(ctx: any) {
    try {
      //authenticate admin
      const user = ctx.state.user;
      if (!user || user.role !== "Admin") {
        ctx.response.status = 403;
        ctx.response.body = { message: "Access denied. Admins only. " };
        return;
      }

      //start transaction
      await db.execute("START TRANSACTION");

      try {
        //reset votes count in votes table
        await db.execute(
          `UPDATE votes SET votes_count = 0, created_at = NULL, candidate_id = NULL`,
        );

        //resete has voted in users table
        await db.execute(`UPDATE users SET has_voted = 0`);

        //commit transaction
        await db.execute("COMMIT");

        ctx.response.status = 200;
        ctx.response.body = {
          message: "Voting records have been successfully reset.",
        };
      } catch (error) {
        // Rollback in case of any error
        await db.execute("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("Error resetting votes:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Internal server error" };
    }
  }
}
