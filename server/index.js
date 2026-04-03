import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { authRoutes } from "./src/routes/auth.routes.js";
import { salesRoutes } from "./src/routes/sales.routes.js";
import { usersRouter } from "./src/routes/users.routes.js";
import { customersRouter } from "./src/routes/customers.routes.js";
import { productsRouter } from "./src/routes/products.routes.js";
import { categoriesRouter } from "./src/routes/categories.routes.js";
import { inventoryRouter } from "./src/routes/inventory.routes.js";
import { posRouter } from "./src/routes/pos.routes.js";
import { reportRoutes } from "./src/routes/report.routes.js";
import { settingsRouter } from "./src/routes/settings.routes.js";
import { paymentsRoutes } from "./src/routes/payments.routes.js";
import passport from "./src/config/PassportConfig.js";
import { setupTrustProxy } from "./src/utils/rateLimiter.js";

dotenv.config();

const app = express();
setupTrustProxy(app);
app.use(passport.initialize());
app.use(helmet());

// Middleware
const normalizeOrigin = (value) => value?.trim().replace(/\/$/, "");

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS || "").split(","),
]
  .map(normalizeOrigin)
  .filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

// Middlewares
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }),
);
app.use(morgan("dev"));
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
app.use("/api/reports", reportRoutes);
app.use("/api/pos", posRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/payments", paymentsRoutes);

app.listen(process.env.PORT || 5000, () => {
  console.log(
    `Server is running on port http://localhost:${process.env.PORT || 5000}`,
  );
});
