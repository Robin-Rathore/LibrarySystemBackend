import bcrypt from "bcrypt";
import { queryDatabase } from "../db.js";
import dotenv from 'dotenv';
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
