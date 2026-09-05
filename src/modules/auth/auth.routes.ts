import { Router } from "express";
import { changeAuthenticatedUserPassword, forgotPassword, login } from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";


const router = Router();

router.post("/login",login);
router.patch("/password", authenticate, changeAuthenticatedUserPassword);
router.post("/forgot-password",forgotPassword);

export default router;
