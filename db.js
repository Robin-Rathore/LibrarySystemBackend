import mysql from 'mysql2/promise'; // Use promise-based mysql2
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql.railway.internal',  // Change to internal host
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'CzHObDvaiWXMPALzxRqjQYvdrOnzGGTK',
    database: process.env.DB_NAME || 'railway',
    port: process.env.DB_PORT || 3306, // Change to the internal port
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
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
    const sql = 'SELECT * FROM books'; // Change to your actual table name
    const books = await queryDatabase(sql);
    console.log('Books:', books); // Log the fetched books here
}

// Initiate the fetch when the app starts
fetchBooks()
    .then(() => console.log('Fetched books successfully!'))
    .catch(err => console.error('Error fetching books:', err));
