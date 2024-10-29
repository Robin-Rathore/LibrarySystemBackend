import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import { loginUser, registerUser } from "./controllers/authController.js";
import { AddBooks, DeleteBook, GetBooks, SearchBook } from "./routes/books.js";

// Load environment variables
dotenv.config();
const app = express();

// CORS configuration
app.use(cors({
    origin: ['http://localhost:5174', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Enable express to parse JSON
app.use(express.json());

// Routes
app.post('/register', registerUser);
app.post('/books/add', AddBooks);
app.delete('/books/:book_id', DeleteBook);
app.post('/login', loginUser);
app.get('/getbooks', GetBooks);
app.get('/searchbooks', SearchBook);

// Error handling for server errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

// Handle 404 errors for unknown routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route Not Found' });
});

// Start the server
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
app.listen(PORT, () => {
    console.log(`Server is running on ${BASE_URL}`);
});
