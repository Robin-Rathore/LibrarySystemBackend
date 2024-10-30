import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import { loginUser, registerUser } from "./controllers/authController.js";
import { AddBooks,  DeleteBook, GetBooks, SearchBook } from "./routes/books.js";

dotenv.config();
const app = express();
app.use(cors());
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
app.get('/test', (req, res) => {
    res.json({ message: 'Backend is running!' });
});
app.use((err, req, res, next) => {
    console.error('Error occurred:', err);
    res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});


// Handle 404 errors for unknown routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route Not Found' });
});

// Start the server
app.listen(process.env.PORT || 5000, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT || 5000}`);
});
