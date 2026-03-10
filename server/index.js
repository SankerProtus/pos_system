import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { authRoutes } from "./src/routes/auth.routes.js";
import passport from "./src/config/PassportConfig.js";

dotenv.config();

const app = express();
app.use(passport.initialize());

// Middleware
const allowedOrigins = [process.env.FRONTEND_URL || "http://localhost:5173"];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"))
app.use(express.urlencoded({ extended: true }));

app.get("/health-check", (req, res) => {
  res.status(200).json({ message: "Server is healthy!" });
});

// Routes
app.use("/api/auth", authRoutes);
// app.use("/api/products", productRoutes);
// app.use("/api/inventory", inventoryRoutes);
// app.use("/api/sales", salesRoutes);
// app.use("/api/customers", customerRoutes);
// app.use("/api/reports", reportRoutes);

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port http://localhost:${process.env.PORT || 5000}`);
});
