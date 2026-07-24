import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("connect", () => {
  console.log("Redis connected");
});

redisClient.on("error", (err) => {
  console.log("Redis error:", err);
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.log("Redis connection failed:", error.message);
  }
};

export { redisClient, connectRedis };