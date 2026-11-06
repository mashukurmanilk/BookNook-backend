import mongoose from "mongoose";

const borrowSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: [true, "Book ID is required"],
    },
    bookTitle: {
      type: String,
      required: [true, "Book title is required"],
      trim: true,
    },
    bookImage: {
      type: String,
      default: "",
    },
    userEmail: {
      type: String,
      required: [true, "Borrower email is required"],
      trim: true,
      lowercase: true,
    },
    userName: {
      type: String,
      required: [true, "Borrower name is required"],
      trim: true,
    },
    borrowDate: {
      type: Date,
      default: Date.now,
    },
    returnDate: {
      type: Date,
      required: [true, "Return due date is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["borrowed", "returned"],
        message: "{VALUE} is not a valid status",
      },
      default: "borrowed",
    },
    returnedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Borrow = mongoose.models.Borrow || mongoose.model("Borrow", borrowSchema);
export default Borrow;
