import http from "http";
import app from "./app.js";
import { dbConnect } from "./config/dbConnect.js";
import {startUpdatingDeliveryJob} from "./jobs/deliveryCron.js"

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await dbConnect();
  startUpdatingDeliveryJob()
  const server = http.createServer(app);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Dairix] running on port ${PORT} — ${process.env.NODE_ENV} mode`);
  });

  server.on("error", (err) => {
    console.error("[Dairix] Server error:", err.message);
    process.exit(1);
  });
};

startServer();
