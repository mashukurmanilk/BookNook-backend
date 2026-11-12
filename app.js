import "dotenv/config";
import express from "express";
import cors from "cors";
import bookRoutes from "./routes/book.routes.js";
import borrowRoutes from "./routes/borrow.routes.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";
import dns from "node:dns";

const app = express();


// Only override DNS servers on local environments (Vercel/AWS restricts external UDP 53)
if (!process.env.VERCEL) {
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
  } catch (e) {
    // Ignore DNS override errors
  }
}

// Global Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      
      const clientUrl = process.env.CLIENT_URL;
      if (
        !clientUrl ||
        clientUrl === "*" ||
        origin === clientUrl ||
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost")
      ) {
        return callback(null, origin);
      }

      return callback(null, origin);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const healthHandler = (req, res) => {
  res.status(200).json({
    success: true,
    message: "BookNook API is running smoothly",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
};

app.get("/", healthHandler);
app.get("/api", healthHandler);

// Mount Resource Routes (support both /books and /api/books for flexible client configurations)
app.use("/books", bookRoutes);
app.use("/api/books", bookRoutes);
app.use("/borrows", borrowRoutes);
app.use("/api/borrows", borrowRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
