import { Router } from "express";
import {
  //aca traer el crud, rutas, metodos que tenga usuario
  obtenerUsuarios,
  crearUsuario
} from "../controllers/usuarioController.js";

const router = Router();

router.get("/users", obtenerUsuarios);

router.post("/crearUsuario", crearUsuario);
export default router;