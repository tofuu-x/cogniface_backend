import { Router } from "express";
import { changeAuthenticatedUserPassword, login } from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";


const router = Router();

router.post("/login",login);
router.patch("/password", authenticate, changeAuthenticatedUserPassword);

export default router;
