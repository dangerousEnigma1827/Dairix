import redisClient from "../config/redis.js";

export const rateLimiter = async (req, res, next) => {
  try {
    const ip = req.ip;
    const key = `rate:${ip}`;
    const requests = await redisClient.incr(key);

    if (requests === 1) {
      await redisClient.expire(key, 60);
    }

    if (requests > 100) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Try again later."
      });
    }

    next();

  }catch(error){
    console.error("Rate limiter error:", error);
    next();
  }
};