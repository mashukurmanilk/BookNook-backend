import { MongoClient } from "mongodb";

let client;

export async function connectToMongoDB() {
  try {
    if (!client) {
      if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not defined in the environment variables");
      }
      client = new MongoClient(process.env.MONGODB_URI);
    }
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}
