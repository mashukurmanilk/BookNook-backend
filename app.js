import dotenv from "dotenv";
import express from "express";
import route from "route";
import {connectToMongoDB} from "./config/db.js";

dotenv.config();
const app=express();
const PORT=process.env.PORT || 8000;
app.use(express.json());
app.use(route);


connectToMongoDB().then(client => {
  const db = client.db("BookNook");
  const booksCollection = db.collection("books");
});
