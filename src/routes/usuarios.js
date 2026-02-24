import { Router } from "express";
import {
  //aca traer el crud, rutas, metodos que tenga usuario
  obtenerUsuarios,
  crearUsuario
} from "../controllers/usuariosController.js";

const router = Router();

router.get("/", obtenerUsuarios);

router.post("crearUsuario", crearUsuario);
export default router;