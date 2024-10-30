import { queryDatabase } from "../db.js";

//1. Add a new Books
export const AddBooks = async (req, res) => {

    const { title, author, isbn, category, total_copies, available_copies, published_year, language, edition, book_condition, shelf_location } = req.body;

    try{
        const query = `INSERT INTO books (title, author, isbn, category, total_copies, available_copies, published_year, language, edition, book_condition, shelf_location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await queryDatabase(query, [title, author, isbn, category, total_copies, available_copies, published_year, language, edition, book_condition, shelf_location]);
        res.status(201).json({message: 'Book Added Sucessfully'});
    } catch(error) {
        res.status(500).json({ error: 'Failed to add book'});
    }
};

//2. Delete a Book Entry

export const DeleteBook = async (req, res) => {
    const { title, author, isbn } = req.query;
    console.log("title : "+title, "author : "+author, "isbn : "+isbn);
    try {
        // Use OR to allow matching any of the fields
        const findBookQuery = "SELECT book_id FROM books WHERE title = ? AND author = ? AND isbn = ? LIMIT 1";
        const result = await queryDatabase(findBookQuery, [title, author, isbn]);

        console.log("result: ", result); // Check what result you get

        if (result.length === 0) {
            return res.status(404).json({ message: "Book Not Found" });
        }

        const bookId = result[0].book_id;

        const deleteQuery = 'DELETE FROM fines WHERE borrow_id IN (SELECT borrow_id FROM BorrowingHistory WHERE book_id = ?)';
        await queryDatabase(deleteQuery, [bookId]);

        const deleteBookQuery = 'DELETE FROM books WHERE book_id = ?';
        await queryDatabase(deleteBookQuery, [bookId]);

        res.status(200).json({ message: "Book Deleted Successfully" });
    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).json({ error: 'Error deleting the book' });
    }
};

export const GetBooks = async (req, res) => {
    const query = `
        SELECT 
            title,
            author,
            category,
            published_year,
            total_copies,
            edition,
            book_condition,
            available_copies,
            shelf_location,
            CASE
                WHEN available_copies > 0 THEN 'Available'
                ELSE 'Not Available'
            END AS availability_status
        FROM books;
    `;

    try {
        const books = await queryDatabase(query);
        res.status(200).json(books);
    } catch (error) {
        console.error("Error fetching books:", error);
        res.status(500).json({ error: "Failed to retrieve books" });
    }
};

// Search for books
export const SearchBook = async (req, res) => {
    const { searchTerm } = req.query;
    const query = `
    SELECT 
    title,
        author,
        category,
        published_year,
        total_copies,
        edition,
        book_condition,
        available_copies,
        shelf_location,
    CASE 
        WHEN available_copies > 0 THEN 'Available'
        ELSE 'Not Available'
    END AS availability_status
    FROM books
    WHERE title LIKE ? OR author LIKE ?;
    `;

    try {
        const books = await queryDatabase(query, [`%${searchTerm}%`, `%${searchTerm}%`]);
        res.status(200).json(books);
    } catch (error) {
        console.error("Error searching books:", error);
        res.status(500).json({ error: "Failed to retrieve search results" });
    }
}
