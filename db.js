import mysql from 'mysql2/promise'; // Use promise-based mysql2
import dotenv from 'dotenv';

dotenv.config();
// Create a connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true, // Wait for connections to be free before proceeding
    connectionLimit: 10, // Maximum number of connections in the pool
    queueLimit: 0 // Unlimited queue of waiting connections
});

// Function to connect and execute a query
export async function queryDatabase(query, params) {
    try {
        const [results, fields] = await pool.query(query, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        throw error; // Rethrow error for further handling if needed
    }
}

// Example usage: Fetch all books
export async function fetchBooks() {
    const sql = 'SELECT * FROM Books'; // Change to your actual table name
    const books = await queryDatabase(sql);
    console.log('Books:', books); // Log the fetched books here
}

// Initiate the fetch when the app starts
fetchBooks()
    .then(() => console.log('Fetched books successfully!'))
    .catch(err => console.error('Error fetching books:', err));
