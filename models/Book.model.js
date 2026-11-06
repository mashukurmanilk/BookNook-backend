import mongoose from "mongoose";

const bookSchema=new mongoose.Schema({
  "title": {
    type: String,
    required: true
  },
  "author": {
    type: String,
    required: true
  },
  "category": {
    type: String,
    enum: ['Fiction', 'Science', 'History', 'Kids', 'Others'],
    required: true
  },
  "image": {
    type: String
  },
  "description": {
    type: String,
    required: true
  },
  "totalCopies": {
    type: Number,
    min: 1,
    default: 1
  },
  "availableCopies": {
    type: Number,
    min: 0
  },
  "userEmail":{
    type: String,
    required: true
  },
  "userName": {
    type: String,
    required: true
  },
  "createdAt": {
    type: Date,
    default: Date.now
  },
  "updatedAt": {
    type: Date,
    default: Date.now
  }
})


module.exports=mongoose.model("Book", bookSchema)

