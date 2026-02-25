import { Router } from "express";
import { obtenerReservas } from "../controllers/reservaController.js";
import { verificarTokenJWT} from "../middleware/auth.js";


const router = Router();

router.get("/reservas", verificarTokenJWT, obtenerReservas );

export default router;