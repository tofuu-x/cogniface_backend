import { Router } from "express";
import { changeAuthenticatedUserPassword, forgotPassword, login, resetPassword } from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";


const router = Router();

router.post("/login",login);
router.patch("/password", authenticate, changeAuthenticatedUserPassword);
router.post("/forgot-password",forgotPassword);
router.post("/reset-password",resetPassword);

export default router;
