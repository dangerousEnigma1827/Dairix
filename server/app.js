import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import errorMiddlewares from "./middlewares/errorMiddlewares.js";


const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())


app.get("/api/health", (req, res) => {
  res.json({ status: "ok", project: "Dairix", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({ status: "ok", project: "Dairix", timestamp: new Date().toISOString() });
});

//routes import
import authRoutes from "./routes/authRoutes.js"
import productRoutes from "./routes/Owner/productRoutes.js"
import dmRoutes from "./routes/Owner/dmRoutes.js"
import customerRoutes from "./routes/Owner/customerRoutes.js"
import customerRoutesByCustomers from "./routes/Customer/customerRoutes.js"

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/dm', dmRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/customers', customerRoutesByCustomers)


//404 + global error handler
app.use(errorMiddlewares)

export default app;