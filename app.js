import "dotenv/config";
import express from "express";
import cors from "cors";
import bookRoutes from "./routes/book.routes.js";
import borrowRoutes from "./routes/borrow.routes.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";
import dns from "node:dns";

const app = express();


dns.setServers(['8.8.8.8', '8.8.4.4']);

// Global Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BookNook API is running smoothly",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Mount Resource Routes
app.use("/books", bookRoutes);
app.use("/borrows", borrowRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
