import "dotenv/config";
import app from "./app.js";
import { connectToMongoDB } from "./config/db.js";

const PORT = process.env.PORT || 8000;

// Connect to MongoDB and listen only when running in traditional Node.js environment
if (!process.env.VERCEL) {
  const startServer = async () => {
    try {
      await connectToMongoDB();
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    } catch (error) {
      console.error("Failed to start server due to database error:", error.message);
      process.exit(1);
    }
  };

  startServer();
}

// Serverless Function export for Vercel
export default async function handler(req, res) {
  try {
    await connectToMongoDB();
  } catch (error) {
    console.error("Serverless MongoDB connection failed:", error.message);
  }
  return app(req, res);
}
