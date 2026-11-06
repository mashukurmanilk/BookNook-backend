import express from "express";
import {
  borrowBook,
  getUserBorrows,
  returnBook,
} from "../controllers/borrow.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All borrow routes require JWT authentication
router.use(verifyToken);

router.post("/", borrowBook);
router.get("/", getUserBorrows);
router.delete("/:id", returnBook);

export default router;
