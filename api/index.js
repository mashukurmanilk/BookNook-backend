import app from "../app.js";
import { connectToMongoDB } from "../config/db.js";

// Vercel Serverless Function entry point for Express app
export default async function handler(req, res) {
  try {
    await connectToMongoDB();
  } catch (error) {
    console.error("Serverless MongoDB connection failed:", error.message);
  }
  return app(req, res);
}
