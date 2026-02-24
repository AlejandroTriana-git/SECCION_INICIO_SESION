import express from "express";
import dotenv from "dotenv";
import usuariosRoutes from "./routes/usuarios.js";


dotenv.config();

app.use(express.json());

//Dejas las APIS
app.use("/clientes", usuariosRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

