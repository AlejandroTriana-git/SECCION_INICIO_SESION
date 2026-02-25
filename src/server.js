import express from "express";
import dotenv from "dotenv";
import usuariosRoutes from "./routes/usuarios.js";
import reservaRoutes from "./routes/reservas.js";
import authRoutes from "./routes/auth.js";

dotenv.config();



const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());

//Dejas las APIS
app.use("/clientes", usuariosRoutes);
app.use("/reservas", reservaRoutes);
app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

