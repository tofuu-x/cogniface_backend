import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.middleware.js";
import { getMyFaceStatus, registerFace, resetFace } from "./face.controller.js";
import { uploadRegistrationImages } from "./face.upload.js";

const router = Router();

router.post("/register", authenticate, authorizeRoles("STUDENT"), uploadRegistrationImages, registerFace);
router.get("/me/status", authenticate, authorizeRoles("STUDENT"), getMyFaceStatus);
router.delete("/students/:studentId", authenticate, authorizeRoles("ADMIN", "SUPER_ADMIN"), resetFace);

export default router;
