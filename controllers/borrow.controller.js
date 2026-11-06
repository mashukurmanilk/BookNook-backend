import mongoose from "mongoose";
import Book from "../models/Book.model.js";
import Borrow from "../models/Borrow.model.js";

// POST /borrows - Borrow a book (Private)
export const borrowBook = async (req, res, next) => {
  try {
    const { bookId, returnDate } = req.body;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: "Book ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Book ID format.",
      });
    }

    if (!returnDate) {
      return res.status(400).json({
        success: false,
        message: "Return date is required.",
      });
    }

    const parsedReturnDate = new Date(returnDate);
    if (isNaN(parsedReturnDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid return date format.",
      });
    }

    const userEmail = req.user.email.toLowerCase();

    // 1. Double Borrow check
    const existingBorrow = await Borrow.findOne({
      bookId,
      userEmail,
      status: "borrowed",
    });

    if (existingBorrow) {
      return res.status(400).json({
        success: false,
        message: "You have already borrowed this book.",
      });
    }

    // 2. Atomic Available Copies Decrement
    const updatedBook = await Book.findOneAndUpdate(
      { _id: bookId, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { returnDocument: "after" }
    );

    if (!updatedBook) {
      // Check if book exists at all
      const bookExists = await Book.findById(bookId);
      if (!bookExists) {
        return res.status(404).json({
          success: false,
          message: "Book not found.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Book is currently out of stock.",
      });
    }

    // 3. Create Borrow Record
    const borrow = new Borrow({
      bookId,
      bookTitle: updatedBook.title,
      bookImage: updatedBook.image,
      userEmail,
      userName: req.user.name,
      borrowDate: new Date(),
      returnDate: parsedReturnDate,
      status: "borrowed",
    });

    const savedBorrow = await borrow.save();

    res.status(201).json({
      success: true,
      message: "Book borrowed successfully.",
      data: {
        _id: savedBorrow._id,
        bookId: savedBorrow.bookId,
        bookTitle: savedBorrow.bookTitle,
        borrowDate: savedBorrow.borrowDate,
        returnDate: savedBorrow.returnDate,
        status: savedBorrow.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /borrows - Get logged-in user's active borrowed books (Private)
export const getUserBorrows = async (req, res, next) => {
  try {
    const userEmail = req.user.email.toLowerCase();

    const borrows = await Borrow.find({
      userEmail,
      status: "borrowed",
    }).sort({ borrowDate: -1 });

    res.status(200).json({
      success: true,
      count: borrows.length,
      data: borrows,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /borrows/:id - Return a book (Private)
export const returnBook = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Borrow record not found.",
      });
    }

    const userEmail = req.user.email.toLowerCase();

    // 1. Find the borrow record belonging to the user
    const borrow = await Borrow.findOne({
      _id: id,
      userEmail,
    });

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: "Borrow record not found.",
      });
    }

    if (borrow.status === "returned") {
      return res.status(400).json({
        success: false,
        message: "This book has already been returned.",
      });
    }

    // 2. Atomically increment book available copies
    await Book.findByIdAndUpdate(borrow.bookId, {
      $inc: { availableCopies: 1 },
    });

    // 3. Remove borrow record (or update status and delete per design.md)
    await Borrow.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Book returned successfully.",
    });
  } catch (error) {
    next(error);
  }
};
