import express from "express";
import cors from "cors";
import authRoutes from "../modules/auth/auth.routes.js"
import { errorMiddleware } from "../middlewares/error.middleware.js";
import env from "../config/env.js";
import lecturerRoutes from "../modules/users/lecturer/lecturer.routes.js";
import studentRoutes from "../modules/users/student/student.routes.js";
import adminRoutes from "../modules/users/admin/admin.routes.js";
import majorRoutes from "../modules/major/major.routes.js";
import courseRoutes from "../modules/course/course.routes.js"
import classRoutes from "../modules/class/class.routes.js"
import enrollmentRoutes from "../modules/enrollment/enrollment.routes.js";
import attendanceRoutes from "../modules/attendance/attendance.routes.js"
import dashboardRoutes from "../modules/dashboard/dashboard.routes.js";


const app = express();

const allowedOrigins = env.client_origin
  ? env.client_origin.split(",").map((origin) => origin.trim()).filter(Boolean)
  : ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

//Authentication
app.use("/api/auth",authRoutes);

//Admin Routes
app.use("/api/admin", adminRoutes)

//Lecturer Routes
app.use("/api/lecturer",lecturerRoutes);

//Student Routes
app.use("/api/student",studentRoutes)

//Major Routes
app.use("/api/major",majorRoutes);

//Course Routes
app.use("/api/course", courseRoutes)

//Class Routes
app.use("/api/class",classRoutes)

//Enrollment Routes
app.use("/api/enrollment",enrollmentRoutes)

//Attendance Routes
app.use("/api/attendance",attendanceRoutes)

//Dashboard Routes
app.use("/api/dashboard",dashboardRoutes)

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorMiddleware);

export default app;
