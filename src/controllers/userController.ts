import { db } from "../../db.ts";
import { hash } from "../../imports.ts";
import { comparePassword, generateToken, generateTokenForVote } from "../helpers/loginHelper.ts";
import { deleteUser, hashPassword } from "../helpers/userHelpers.ts";

export class UserController{

    //register user
    async handleRegister(ctx:any) {
        try{
            const body = await ctx.request.body.json();
            const {username, password, email, role } = body;
        

        //checking if user exists
        const result = await db.query(
            `SELECT * FROM users WHERE username = ?`, 
            [username]
        );

        if(result.length > 0) {
            ctx.response.status = 401;
            ctx.response.body = { message: "Username already exists. " };
            return;
          }

         //validate username to start with capital letter
            const capLetter = /^[A-Z]/.test(username);
            if(!capLetter) {
            ctx.response.status = 400;
            ctx.response.body = { message: "Username must start with a capital letter. " };
            return;
        }

        //validating email
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Valid email is required" };
            return;
            }
  

          //validate input
          if(!username || !password) {
            ctx.response.status = 401;
            ctx.response.body = { message: "Password and username are required." };
            return;
          }
        
        //password validation
        const minLength = 8;
        const maxLength = 64;

        if(password.length < minLength || password.length > maxLength) {
        ctx.response.status = 400;
        ctx.response.body = { message: "Password must be between 8 and 64 characters. " };
        return; 
    }

        //Check for lowercase, uppercase,digit and special character
        const uppercase = /[A-Z]/.test(password);
        const lowercase = /[a-z]/.test(password);
        const digit = /\d/.test(password);
        const specialChar = /[!@#$%^&*()_\-=+<>?]/.test(password);

        if(!uppercase || !lowercase || !digit || !specialChar) {
        ctx.response.status = 400;
        ctx.response.body = { message: "Password must include uppercase, lowercase, digit and a special character. " };
        return; 
    }

        //hashpassword
        const hashedPassword = await hashPassword(password);

        //insert user into db
        const has_voted = false;
    

        await db.execute(
            `INSERT INTO users (username, password, has_voted, email, role) VALUES (?, ?, ?, ?, ?)`,
            [username, hashedPassword, has_voted, email, role]
        );

        ctx.response.status = 201;
        ctx.response.body = { message: `User registered successfully.` };

    } catch (error) {
        console.error(error);
        ctx.response.status = 500;
        ctx.response.body = { message: "Error registering user" }
    }

    }

    //login user
    async handleLogin(ctx: any) {
        try{
            const body = await ctx.request.body.json();
            const {username, password} = body;

            //validate input
            if(!username || !password) {
                ctx.response.status = 400;
                ctx.response.body = {error: "Username and Password are required."};
                return;
            }

            //check if user exists
            const result = await db.query(
                `SELECT * FROM users WHERE username = ?`,
                [username]
            );
            if(!result) {
                ctx.response.status = 404;
                ctx.response.body = {error: "User not found"};
                return;
            }

            //verify password
            const user = result[0];
            const isPasswordValid = await comparePassword(password, user.password)
            if(!isPasswordValid) {
                ctx.response.status = 401;
                ctx.response.body = {error: "Invalid credentials. "};
                return; 
            }

            //generate a jwt token
            const token = await generateToken(user.username, user.role);

            //respond with token
            ctx.response.status = 200;
            ctx.response.body = {token};


        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = {error: "Internal server error. "}
        }
    }

    //delete user by an admin
    async removeUser(ctx:any) {
        try{
            const body = await ctx.request.body.json();
            const {username} = body;

            //validate input
                if(!username) {
                    ctx.response.status = 400;
                    ctx.response.body = {error: "Provide username to delete. "};
                    return;
                }

                //validate user role
                const user = ctx.state.user;
                if(!user || user.role !== "Admin"){
                    ctx.response.status = 403;
                    ctx.response.body = {message: "Only authorized users can delete users"};
                    return;
                } 

                const userDeleted = await deleteUser(username);

                if(userDeleted){
                    ctx.response.status = 200;
                    ctx.response.body = {error: "User successfully deleted. "};
                    return;
                } else {
                    ctx.response.status = 404;
                    ctx.response.body = {error:"User not found"};
                }
        } catch (error) {
            console.error("Error de;eting user", error);
            ctx.response.status = 500;
            ctx.response.body = {error: "Internal server error. "};
            return;
        }
    }

// Request password reset
async requestPasswordReset(ctx: any) {
    try {
        const { username } = await ctx.request.body.json();

        // Check if user exists
        const [user] = await db.query(`SELECT * FROM users WHERE username = ?`, [username]);
        if (!user) {
            ctx.response.status = 404;
            ctx.response.body = { message: "User not found" };
            return;
        }

        const resetToken = await generateTokenForVote(username);
        const tokenExpiry = new Date(Date.now() + 3600 * 1000); // 1-hour expiry
        await db.query(`UPDATE users SET reset_token = ?, token_expiry = ? WHERE username = ?`, 
                       [resetToken, tokenExpiry, username]);

        ctx.response.status = 200;
        ctx.response.body = { resetToken };
    } catch (error) {
        console.error(error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
    }
}

// Reset password
async resetPassword(ctx: any) {
    try {
        const { newPassword, username, resetToken } = await ctx.request.body.json();

        // Validate reset token and expiry
        const [user] = await db.query(`SELECT * FROM users WHERE username = ? AND reset_token = ?`, 
                                      [username, resetToken]);
        if (!user || new Date(user.token_expiry) < new Date()) {
            ctx.response.status = 400;
            ctx.response.body = { message: "Invalid or expired reset token" };
            return;
        }

        // Hash new password
        const hashedPassword = await hash(newPassword);

        // Update password in the database and clear reset token
        await db.query(`UPDATE users SET password = ?, reset_token = NULL, token_expiry = NULL WHERE username = ?`, 
                       [hashedPassword, username]);

        ctx.response.status = 200;
        ctx.response.body = { message: "Password reset successfully" };
    } catch (error) {
        console.error(error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
    }
}
/*
//Admin login
async handleAdminLogin(ctx: any) {
    try{
        const body = await ctx.request.body.json();
        const {username, password} = body;

        //validate input
        if(!username || !password) {
            ctx.response.status = 400;
            ctx.response.body = {error: "Username and Password are required."};
            return;
        }
 
        //validate user role
        const user = ctx.state.user;
        if(!user || user.role !== "Admin") {
            ctx.response.status = 403;
            ctx.response.body = {message: "Access denied. Admins only"};
            return;
        } 

        //check if user exists
        const result = await db.query(
            `SELECT * FROM users WHERE username = ?`,
            [username]
        );
        if(!result) {
            ctx.response.status = 404;
            ctx.response.body = {error: "User not found"};
            return;
        }

        //verify password
        const users = result[0];
        const isPasswordValid = await comparePassword(password, users.password)
        if(!isPasswordValid) {
            ctx.response.status = 401;
            ctx.response.body = {error: "Invalid credentials. "};
            return; 
        }

        //generate a jwt token
        const token = await generateToken(users.username, users.role);

        //respond with token
        ctx.response.status = 200;
        ctx.response.body = {token};


    } catch (error) {
        console.error(error);
        ctx.response.status = 500;
        ctx.response.body = {error: "Internal server error. "}
    }
}
    */
}