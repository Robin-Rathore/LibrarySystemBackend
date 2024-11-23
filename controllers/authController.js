import bcrypt from "bcrypt";
import { queryDatabase } from "../db.js";
import dotenv from 'dotenv';
import nodemailer from 'nodemailer'
import jwt from "jsonwebtoken";
dotenv.config();

// REGISTRATION
export const registerUser = async (req, res) => {
    const { name, email, password, role, membership_type } = req.body;

    const validRoles = ['student', 'staff', 'admin'];
    const validMemberships = ['regular', 'premium'];

    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role provided." });
    }

    if (!validMemberships.includes(membership_type)) {
        return res.status(400).json({ message: "Invalid membership type provided." });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (name, email, password_hash, role, membership_type) VALUES (?, ?, ?, ?, ?)';
        await queryDatabase(sql, [name, email, passwordHash, role, membership_type]);

        res.status(201).json({ message: "User Registered Successfully" });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Email already exists." });
        }
        console.error("Error Registering User:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// LOGIN
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const users = await queryDatabase(sql, [email]);

        if (!users || users.length === 0) {
            return res.status(401).json({ message: "User does not exist, please register" });
        }

        const user = users[0]; // Get the first user object
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token });

    } catch (error) {
        console.error('Error logging in user:', error.message || error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// middleware/auth.js
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Get token from "Bearer <token>"

    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token is invalid' });
        req.user = user;
        next();
    });
};

// Check book ownership middleware
export const checkBookOwner = async (req, res, next) => {
    const { book_id } = req.params;
    const user_id = req.user.userId;

    try {
        const query = "SELECT user_id FROM books WHERE book_id = ?";
        const result = await queryDatabase(query, [book_id]);

        if (result.length === 0) {
            return res.status(404).json({ message: "Book Not Found" });
        }

        const bookOwnerId = result[0].user_id;

        if (bookOwnerId !== user_id) {
            return res.status(403).json({ message: "You are not authorized to perform this action" });
        }

        next(); // User is the owner, proceed to the next middleware/route handler
    } catch (error) {
        console.error("Error checking book ownership:", error);
        res.status(500).json({ error: "Error checking book ownership" });
    }
};



// Helper function to generate a random OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000);

export const requestOTP = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        // Generate a 6-digit OTP
        const otp = generateOTP();

        // Store OTP in the database with expiration time (e.g., 5 minutes)
        const expirationTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        const expirationTimeString = expirationTime.toISOString().slice(0, 19).replace('T', ' '); // Format as 'YYYY-MM-DD HH:MM:SS'

        const sql = 'INSERT INTO otp_requests (email, otp, expires_at) VALUES (?, ?, ?)';
        await queryDatabase(sql, [email, otp, expirationTimeString]);


        // Send OTP via email using nodemailer
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: email,
            subject: "🔒 YourLibrary: Verify Your Account with OTP",
            html: `
                <div style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0;">Welcome to YourLibrary</h1>
                        <p style="margin: 0; font-size: 1.1em;">Your gateway to infinite knowledge</p>
                    </div>
                    <div style="padding: 20px;">
                        <h2 style="color: #4CAF50; text-align: center;">Your OTP Code</h2>
                        <p>Hi there,</p>
                        <p>Thank you for signing up with <strong>YourLibrary</strong>. To verify your account, please use the One-Time Password (OTP) below:</p>
                        <div style="font-size: 2em; font-weight: bold; color: #4CAF50; text-align: center; margin: 20px 0;">
                            ${otp}
                        </div>
                        <p style="text-align: center; font-size: 0.9em; color: #555;">This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone.</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <p>If you did not request this OTP, please disregard this email or <a href="mailto:support@yourlibrary.com" style="color: #4CAF50; text-decoration: none;">contact our support team</a>.</p>
                    </div>
                    <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 0.9em; color: #555;">
                        <p>Regards,</p>
                        <p>The <strong>YourLibrary</strong> Team</p>
                        <p style="margin-top: 10px;">
                            <strong>Robin Rathore</strong><br>
                            <a href="https://www.linkedin.com/in/robin-rathore-833863238?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BpSnYjaHgTsCIp5pYWi4TOA%3D%3D" target="_blank" style="color: #4CAF50; text-decoration: none;">Connect with me on LinkedIn</a>
                        </p>
                        <p style="margin-top: 20px; font-size: 0.8em; color: #aaa;">
                            &copy; ${new Date().getFullYear()} YourLibrary, All rights reserved.
                        </p>
                    </div>
                </div>
            `,
        };               

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "OTP sent successfully", otpId: otp});
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};



// Verify OTP
export const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
    }

    try {
        // Check if the OTP exists and is valid
        const sql = ' SELECT * FROM otp_requests WHERE email = ? AND otp = ? AND expires_at > NOW() ';
        const result = await queryDatabase(sql, [email, otp]);

        if (result.length === 0) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // OTP is valid, mark the email as verified
        const updateSql = ' UPDATE users SET is_verified = 1 WHERE email = ?';
        await queryDatabase(updateSql, [email]);

        // Optionally delete the OTP record after successful verification
        const deleteSql = 'DELETE FROM otp_requests WHERE email = ?';
        await queryDatabase(deleteSql, [email]);

        res.status(200).json({success: true, message: "OTP verified successfully" });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


//Check Email
export const checkEmail = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const sql = 'SELECT email, is_verified FROM users WHERE email = ?';
        const result = await queryDatabase(sql, [email]);

        if (result.length === 0) {
            return res.status(404).json({ message: "Email not registered" });
        }

        const { is_verified } = result[0];

        res.status(200).json({
            message: "Email found",
            isVerified: Boolean(is_verified),
        });
    } catch (error) {
        console.error("Error checking email:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


//Resend OTP

export const resendOTP = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        // Check if the user exists
        const userCheckSql ='SELECT email FROM users WHERE email = ?';
        const userResult = await queryDatabase(userCheckSql, [email]);

        if (userResult.length === 0) {
            return res.status(404).json({ message: "Email not registered" });
        }

        // Check for an existing valid OTP
        const otpCheckSql = 'SELECT otp, expires_at FROM otp_requests WHERE email = ? AND expires_at > NOW()';
        const otpResult = await queryDatabase(otpCheckSql, [email]);

        let otp;
        if (otpResult.length > 0) {
            // Use the existing valid OTP
            otp = otpResult[0].otp;
        } else {
            // Generate a new OTP
            otp = Math.floor(100000 + Math.random() * 900000);
            const expirationTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

            const insertSql = 'INSERT INTO otp_requests (email, otp, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?';
            await queryDatabase(insertSql, [email, otp, expirationTime, otp, expirationTime]);
        }

        // Send OTP via email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: email,
            subject: "Your OTP Code (Resent)",
            text: 'Your OTP code is ${otp}. It is valid for 5 minutes.',
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "OTP resent successfully" });
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// const sql = `
//             INSERT INTO otp_requests (email, otp, expires_at) 
//             VALUES (?, ?, ?) 
            // ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)