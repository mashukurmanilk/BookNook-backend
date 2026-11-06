import "dotenv/config";
import app from "./app.js";
import { connectToMongoDB } from "./config/db.js";

const PORT = process.env.PORT || 8000;

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
