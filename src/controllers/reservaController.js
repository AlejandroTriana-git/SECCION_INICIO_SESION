
import pool from "../config/db.js";

//Para traer las reservas segun un filtro, se usa query params, donde se envia por sql, va despues de ?
export const obtenerReservas = async (req, res) => {
  try {
    
    const [rows] = await pool.query(
      `SELECT * FROM reserva`);
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener reservas" });
  }
};

