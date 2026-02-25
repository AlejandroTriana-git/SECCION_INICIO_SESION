
import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_corta"; // en prod usar env var
const JWT_EXPIRES_IN = "8h"; // ajusta según necesidad



export const verificarAuth = async (req, res) => {
  let connection = null;

  try {
    console.log("🔍 Verificando token...");

    const { correo, contraseña } = req.body;
    if (!correo || !contraseña) {
      return res.status(400).json({ error: "Datos requeridos" });
    }

    // Obtener idCliente (no confirmar existencia pública)
    const [clienteRows] = await pool.query(
      "SELECT idCliente, rol, contraseña FROM cliente WHERE correo = ? LIMIT 1 FOR UPDATE",
      [correo]
    );

    if (clienteRows.length === 0) {
      // Mensaje genérico para evitar enumeración
      return res.status(400).json({ error: "Código inválido o expirado" });
    }
    const idCliente = clienteRows[0].idCliente;
    const rol = clienteRows[0].rol;
    const contraseñaHash = clienteRows[0].contraseña;

    // Parámetros de seguridad
    const VENTANA_BLOQUEO_MINUTOS = 15;
    const MAX_INTENTOS = 5;    
    const VENTANA_INTENTOS_MINUTOS = 15;

    // Obtener conexión dedicada porque se hacen transacciones
    connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1) desbloquear bloqueos vencidos
      await connection.query(
        `UPDATE intentosVerificacion 
         SET bloqueado = 0 
         WHERE idCliente = ? 
           AND bloqueado = 1 
           AND fecha < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
        [idCliente, VENTANA_BLOQUEO_MINUTOS]
      );

      // 2) verificar si hay bloqueo activo (calcular minutos restantes en SQL) - FOR UPDATE 
      const [bloqueoRows] = await connection.query(
        `SELECT idIntentosVerificacion,
                CEIL(GREATEST(TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(fecha, INTERVAL ? MINUTE)), 0)/60) AS minutosRestantes
         FROM intentosVerificacion
         WHERE idCliente = ? AND bloqueado = 1 AND fecha >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
         ORDER BY fecha DESC
         LIMIT 1
         FOR UPDATE`,
        [VENTANA_BLOQUEO_MINUTOS, idCliente, VENTANA_BLOQUEO_MINUTOS]
      );

      if (bloqueoRows.length > 0) {
        const tiempoRestante = bloqueoRows[0].minutosRestantes;
        await connection.rollback();
        console.log(`🚫 Cliente ${idCliente} está bloqueado`);
        return res.status(429).json({
          error: `Cuenta temporalmente bloqueada. Intenta en ${tiempoRestante} minuto(s).`
        });
      }

      // 3) contar intentos fallidos recientes (FOR UPDATE )
      const [intentosRows] = await connection.query(
        `SELECT COUNT(*) AS total
         FROM intentosVerificacion
         WHERE idCliente = ? AND exitoso = 0 AND fecha >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
         FOR UPDATE`,
        [idCliente, VENTANA_INTENTOS_MINUTOS]
      );

      const intentosFallidos = intentosRows[0].total;
      
      // 4) si excede límite → insertar bloqueo y hacer commit
      if (intentosFallidos >= MAX_INTENTOS-1) {
        await connection.query(
          `INSERT INTO intentosVerificacion (idCliente, exitoso, bloqueado, fecha)
           VALUES (?, 0, 1, NOW())`,
          [idCliente]
        );

        await connection.commit();
        console.log(`⚠️ Cliente ${idCliente} alcanzó límite de intentos - BLOQUEANDO`);
        return res.status(429).json({
          error: `Demasiados intentos fallidos. Cuenta bloqueada por ${VENTANA_BLOQUEO_MINUTOS} minutos.`
        });
      }

      // 5) validar token (seleccionar FOR UPDATE para bloquear la fila mientras la consumimos)
      
      const contraseñaValida = await bcrypt.compare(contraseña, contraseñaHash);
      

      if (!contraseñaValida){
        // Registrar intento fallido
        await connection.query(
          `INSERT INTO intentosVerificacion (idCliente, exitoso, fecha)
           VALUES (?, 0, NOW())`,
          [idCliente]
        );

        // calcular intentos restantes (sin necesidad de nueva query: intentosFallidos + 1)
        const intentosActuales = intentosFallidos + 1;
        const intentosRestantes = Math.max(0, MAX_INTENTOS - intentosActuales);

        await connection.commit(); // commit cambios (registro del intento)
        console.log(`❌ Token inválido para cliente ${idCliente}`);
        if (intentosRestantes > 0) {
          return res.status(400).json({
            error: `Código inválido o expirado. Te quedan ${intentosRestantes} intento(s).`
          });
        } else {
          return res.status(400).json({ error: "Código inválido o expirado." });
        }
      }

      // 6) registrar intento exitoso
      await connection.query(
        `INSERT INTO intentosVerificacion (idCliente, exitoso, fecha)
         VALUES (?, 1, NOW())`,
        [idCliente]
      );

      // limpieza de intentos antiguos SOLO de este cliente (evitar borrar todo)
      await connection.query(
        `DELETE FROM intentosVerificacion
         WHERE idCliente = ? AND fecha < DATE_SUB(NOW(), INTERVAL 1 DAY)`,
        [idCliente]
      );

      await connection.commit();

      console.log(`✅ Verificación exitosa - Cliente ${idCliente}`);

    } catch (txErr) {
      if (connection) {
        try { await connection.rollback(); } catch (e) { console.error("Rollback falló:", e); }
      }
      throw txErr;
    } finally {
      if (connection) connection.release();
      connection = null;
    }
    
    console.log('Desde este punto comienza a generar json web token');

    const payload = {
        id: idCliente,
        rol: rol || "cliente",

    };

    const tokenWeb = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Responder con token y datos mínimos del usuario
    const user = {
        id: idCliente,
        rol: rol || "cliente"
    };

    return res.status(200).json({
      message: "Verificación exitosa",
      tokenWeb, user
    });

  } catch (error) {
    console.error("💥 ERROR en verificarToken:", error);
    
    return res.status(500).json({ error: "Error al verificar código" });
  } finally {
    // guard para liberar si algo falló antes del finally interno
    if (connection) {
      try { connection.release(); } catch (e) { /* no-op */ }
    }
  }
};
