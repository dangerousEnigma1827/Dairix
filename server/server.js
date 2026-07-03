import http from "http";
import app from "./app.js";
import { dbConnect } from "./config/dbConnect.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await dbConnect();
  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`[DairyDesk] Server running on port ${PORT} — ${process.env.NODE_ENV} mode`);
  });

  server.on("error", (err) => {
    console.error("[DairyDesk] Server error:", err.message);
    process.exit(1);
  });
};

startServer();
