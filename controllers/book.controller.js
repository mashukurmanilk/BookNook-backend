import mongoose from "mongoose";
import Book from "../models/Book.model.js";
import Borrow from "../models/Borrow.model.js";

// GET /books - Fetch all books with optional filters (limit, sort, category, userEmail, search)
export const getAllBooks = async (req, res, next) => {
  try {
    const { limit, sort, category, userEmail, search } = req.query;

    const query = {};

    if (category) {
      query.category = category;
    }

    if (userEmail) {
      query.userEmail = userEmail.toLowerCase();
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [{ title: searchRegex }, { author: searchRegex }];
    }

    let sortOptions = { createdAt: -1 };
    if (sort) {
      if (sort === "newest") {
        sortOptions = { createdAt: -1 };
      } else if (sort === "oldest") {
        sortOptions = { createdAt: 1 };
      } else if (sort === "title_asc") {
        sortOptions = { title: 1 };
      } else if (sort === "title_desc") {
        sortOptions = { title: -1 };
      }
    }

    let queryBuilder = Book.find(query).sort(sortOptions);

    if (limit) {
      const parsedLimit = parseInt(limit, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        queryBuilder = queryBuilder.limit(parsedLimit);
      }
    }

    const books = await queryBuilder;

    res.status(200).json({
      success: true,
      count: books.length,
      data: books,
    });
  } catch (error) {
    next(error);
  }
};

// GET /books/:id - Get single book details
export const getBookById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
};

// POST /books - Add a new book (Private)
export const createBook = async (req, res, next) => {
  try {
    const { title, author, category, image, description, totalCopies } = req.body;

    const parsedTotalCopies = totalCopies ? parseInt(totalCopies, 10) : 1;

    const book = new Book({
      title,
      author,
      category,
      image: image || "",
      description,
      totalCopies: parsedTotalCopies,
      availableCopies: parsedTotalCopies,
      userEmail: req.user.email.toLowerCase(),
      userName: req.user.name,
    });

    const savedBook = await book.save();

    res.status(201).json({
      success: true,
      message: "Book added successfully.",
      data: savedBook,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /books/:id - Update book (Private, Owner only)
export const updateBook = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    // Verify ownership
    if (book.userEmail.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to edit this book.",
      });
    }

    const { title, author, category, image, description, totalCopies } = req.body;

    if (title !== undefined) book.title = title;
    if (author !== undefined) book.author = author;
    if (category !== undefined) book.category = category;
    if (image !== undefined) book.image = image;
    if (description !== undefined) book.description = description;

    if (totalCopies !== undefined) {
      const newTotal = parseInt(totalCopies, 10);
      if (isNaN(newTotal) || newTotal < 1) {
        return res.status(400).json({
          success: false,
          message: "Total copies must be a positive number greater than or equal to 1.",
        });
      }

      // Calculate difference and adjust availableCopies
      const diff = newTotal - book.totalCopies;
      const newAvailable = book.availableCopies + diff;

      if (newAvailable < 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot reduce total copies below currently borrowed copies.",
        });
      }

      book.totalCopies = newTotal;
      book.availableCopies = newAvailable;
    }

    const updatedBook = await book.save();

    res.status(200).json({
      success: true,
      message: "Book updated successfully.",
      data: updatedBook,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /books/:id - Delete book (Private, Owner only)
export const deleteBook = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    // Verify ownership
    if (book.userEmail.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to delete this book.",
      });
    }

    // Check for active borrows
    const activeBorrows = await Borrow.countDocuments({
      bookId: id,
      status: "borrowed",
    });

    if (activeBorrows > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete book while there are active borrow records.",
      });
    }

    await Book.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Book deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
