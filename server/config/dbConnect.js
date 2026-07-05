import mongoose from "mongoose";

export const dbConnect = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("[DB] MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[DB] MongoDB connected → ${conn.connection.host}`);
  } catch (err) {
    console.error(`[DB] Connection failed: ${err.message}`);
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("[DB] MongoDB disconnected.");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[DB] Runtime error:", err.message);
  });
  
};