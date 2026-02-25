import { Router } from "express";
import { obtenerReservas } from "../controllers/reservaController";
import { verificarTokenJWT} from "../middleware/auth";


const router = Router();

router.get("/reservas", verificarTokenJWT, obtenerReservas );

export default router;