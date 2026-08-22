import express from "express";
import authRoutes from "../modules/auth/auth.routes.js"
import { errorMiddleware } from "../middlewares/error.middleware.js";
import lecturerRoutes from "../modules/users/lecturer/lecturer.routes.js";


const app = express();

app.use(express.json());

//Authentication
app.use("/api/auth",authRoutes);

//Lecturer Routes
app.use("/api/lecturer",lecturerRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorMiddleware);

export default app;
