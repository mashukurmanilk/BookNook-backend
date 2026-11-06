import mongoose from "mongoose";

const borrowSchema=new mongoose.Schema({
  "bookId": {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book",
    required: true
  },
  "bookTitle": {
    type: String,
    required: true
  },
  "bookImage": {
    type: String
  },
  "userEmail": {
    type: String,
    required: true
  },
  "userName": {
    type: String,
    required: true
  },
  "borrowDate": {
    type: Date,
    default: Date.now
  },
  "returnDate": {
    type: Date
  },
  "status": {
    type: String,
    enum: ['borrowed', 'returned'],
    default: 'borrowed'
  },
  "returnedAt": {
    type: Date
  }

})

module.exports=mongoose.model("Borrow", borrowSchema)