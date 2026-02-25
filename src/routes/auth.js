import { Router } from "express";
import { verificarAuth} from "../controllers/authController.js";

const router = Router();

router.post("/verificar", verificarAuth);

export default router;