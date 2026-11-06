import "dotenv/config";
import express from "express";
import { connectToMongoDB } from "./config/db.js";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
const PORT = process.env.PORT || 8000;
app.use(express.json());

connectToMongoDB()
  .then((client) => {
    const db = client.db("BookNook");
    const booksCollection = db.collection("books");
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
