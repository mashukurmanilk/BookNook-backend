import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    author: {
      type: String,
      required: [true, "Author is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["Fiction", "Science", "History", "Kids", "Others"],
        message: "{VALUE} is not a valid category",
      },
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    totalCopies: {
      type: Number,
      required: [true, "Total copies is required"],
      min: [1, "Total copies must be at least 1"],
      default: 1,
    },
    availableCopies: {
      type: Number,
      min: [0, "Available copies cannot be negative"],
      default: function () {
        return this.totalCopies;
      },
    },
    userEmail: {
      type: String,
      required: [true, "Creator email is required"],
      trim: true,
      lowercase: true,
    },
    userName: {
      type: String,
      required: [true, "Creator name is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Book = mongoose.models.Book || mongoose.model("Book", bookSchema);
export default Book;
