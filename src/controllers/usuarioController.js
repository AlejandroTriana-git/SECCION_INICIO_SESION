import pool from "../config/db.js";



//Para crear los tokenHash para las contraseñas:
const bcrypt = require("bcrypt");


//Seccion para obtener a los usuarios y crear a los usuarios.
export const obtenerUsuarios = async (req, res) => {
  try{
    const [rows] = await pool.query("SELECT idCliente, nombre, correo, telefono FROM cliente WHERE activo = 1");
    res.status(200).json(rows);
  } catch (error){
    res.status(500).json({error: "Error al obtener usuariossssss"});
  }
  
};


export const crearUsuario = async (req, res) => {
  try{
    const { nombre, correo, contraseña } = req.body;
    if (!nombre || !correo || !contraseña) {
      return res.status(400).json({error : "Nombre, correo y contraseña son obligatorios"});
    };

    const [existe_correo] = await pool.query(
      "SELECT idCliente FROM cliente WHERE correo = ? ", 
      [correo]);

    if (existe_correo.length > 0){
      return res.status(409).json({error: "El correo ya esta registrado"});
    };

    const contraseñaHash = await bcrypt.hash(contraseña, 10);

    
    await pool.query("INSERT INTO cliente (nombre, correo, contraseña) VALUES (?, ?, ?)", [
      nombre,
      correo,
      contraseñaHash,
      ]);
    res.status(201).json({ message: "Cliente creado:", nombre});
    
  }catch(error){
    console.error("Error en crearUsuario:", error); // 👈 Agregar esto
    res.status(500).json({error: "Error al crear usuario"})

  }
  
};


