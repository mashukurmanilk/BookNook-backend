import mongoose from "mongoose";

let isConnected = false;

export async function connectToMongoDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  try {
    const conn = await mongoose.connect(uri, {
      dbName: process.env.DB_NAME || "BookNook",
    });

    isConnected = true;
    console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
}

export const connectDB = connectToMongoDB;
export default connectToMongoDB;
