import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { authRoutes } from "./src/routes/auth.routes.js";
import { salesRoutes } from "./src/routes/sales.routes.js";
import { usersRouter } from './src/routes/users.routes.js';
import { customersRouter } from './src/routes/customers.routes.js';
import { productsRouter } from './src/routes/products.routes.js';
import { categoriesRouter } from "./src/routes/categories.routes.js";
import { inventoryRouter } from "./src/routes/inventory.routes.js";
import { posRouter } from "./src/routes/pos.routes.js";
import passport from "./src/config/PassportConfig.js";

dotenv.config();

const app = express();
app.use(passport.initialize());

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  process.env.FRONTEND_URL || "http://localhost:5173"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
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
app.use("/api/sales", salesRoutes);
app.use("/api/users", usersRouter);
app.use("/api/customers", customersRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/pos", posRouter);

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port http://localhost:${process.env.PORT || 5000}`);
});
