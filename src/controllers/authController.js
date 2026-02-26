
import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_corta"; // en prod usar env var
const JWT_EXPIRES_IN = "8h"; // ajusta según necesidad




export const verificarAuth = async (req, res) => {
  let connection = null;

  try {
    const VENTANA_BLOQUEO_MINUTOS = 15;
    const MAX_INTENTOS = 5;
    const VENTANA_INTENTOS_MINUTOS = 15;

    // Validación básica del body
    const { correo, contraseña } = req.body;
    if (!correo || !contraseña) {
      return res.status(400).json({ error: "Datos requeridos" });
    }

    // Obtener conexión dedicada porque haremos transacción y locks
    connection = await pool.getConnection();

    // INICIAR transacción antes de cualquier SELECT ... FOR UPDATE
    await connection.beginTransaction();
    ("Verificando token (tx iniciada) para correo:", correo);

    // 0) Seleccionar cliente con FOR UPDATE usando la misma conexión/tx
    const [clienteRows] = await connection.query(
      "SELECT idCliente, rol, contraseña FROM cliente WHERE correo = ? LIMIT 1 FOR UPDATE",
      [correo]
    );

    if (clienteRows.length === 0) {
      // no existe - rollback y respuesta genérica
      await connection.rollback();
      ("Usuario no encontrado para correo:", correo);
      return res.status(400).json({ error: "Correo o contraseña invalido" });
    }

    const idCliente = clienteRows[0].idCliente;
    const rol = clienteRows[0].rol;
    const contraseñaHash = clienteRows[0].contraseña;

    // 1) desbloquear bloqueos vencidos (misma conexión)
    await connection.query(
      `UPDATE intentosVerificacion
       SET bloqueado = 0
       WHERE idCliente = ? 
         AND bloqueado = 1
         AND fechaIntentoVerificacion < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [idCliente, VENTANA_BLOQUEO_MINUTOS]
    );

    // 2) verificar si hay bloqueo activo (calcular minutos restantes) - FOR UPDATE para serializar
    const [bloqueoRows] = await connection.query(
      `SELECT idIntentosVerificacion,
              CEIL(GREATEST(TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(fechaIntentoVerificacion, INTERVAL ? MINUTE)), 0)/60) AS minutosRestantes,
              bloqueado, fechaIntentoVerificacion
       FROM intentosVerificacion
       WHERE idCliente = ? AND bloqueado = 1 AND fechaIntentoVerificacion >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
       ORDER BY fechaIntentoVerificacion DESC
       LIMIT 1
       FOR UPDATE`,
      [VENTANA_BLOQUEO_MINUTOS, idCliente, VENTANA_BLOQUEO_MINUTOS]
    );

    if (bloqueoRows.length > 0) {
      const tiempoRestante = bloqueoRows[0].minutosRestantes;
      ("Fila de bloqueo activa encontrada:", bloqueoRows[0]);
      await connection.rollback();
      return res.status(429).json({
        error: `Cuenta temporalmente bloqueada. Intenta en ${tiempoRestante} minuto(s).`
      });
    }

    // 3) contar intentos fallidos recientes (FOR UPDATE para serializar)
    const [intentosRows] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM intentosVerificacion
       WHERE idCliente = ? AND exitoso = 0 AND fechaIntentoVerificacion >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
       FOR UPDATE`,
      [idCliente, VENTANA_INTENTOS_MINUTOS]
    );

    const intentosFallidos = intentosRows[0].total;
    ("IntentosFallidos (recientes):", intentosFallidos, "para idCliente:", idCliente);

    // 4) si el intento actual haría superar el límite → insertar bloqueo (bloqueado=1)
    if (intentosFallidos + 1 >= MAX_INTENTOS) {
      const insertRes = await connection.query(
        `INSERT INTO intentosVerificacion (idCliente, exitoso, bloqueado, fechaIntentoVerificacion)
         VALUES (?, 0, 1, NOW())`,
        [idCliente]
      );
      ("Insert bloqueo result:", insertRes[0] || insertRes);
      await connection.commit();
      (`Cliente ${idCliente} alcanzó límite de intentos - BLOQUEANDO`);
      return res.status(429).json({
        error: `Demasiados intentos fallidos. Cuenta bloqueada por ${VENTANA_BLOQUEO_MINUTOS} minutos.`
      });
    }

    // 5) validar contraseña
    const contraseñaValida = await bcrypt.compare(contraseña, contraseñaHash);

    if (!contraseñaValida) {
      // Registrar intento fallido
      const ins = await connection.query(
        `INSERT INTO intentosVerificacion (idCliente, exitoso, fechaIntentoVerificacion)
         VALUES (?, 0, NOW())`,
        [idCliente]
      );
      ("Insert intento fallido:", ins[0] || ins);

      // calcular intentos restantes
      const intentosActuales = intentosFallidos + 1;
      const intentosRestantes = Math.max(0, MAX_INTENTOS - intentosActuales);

      await connection.commit();
      (`Contraseña inválida - cliente ${idCliente} - intentosRestantes: ${intentosRestantes}`);

      if (intentosRestantes > 0) {
        return res.status(400).json({
          error: `Código inválido o expirado. Te quedan ${intentosRestantes} intento(s).`
        });
      } else {
        return res.status(400).json({ error: "Correo o contraseña invalido." });
      }
    }

    // 6) registrar intento exitoso y limpiar antiguos
    await connection.query(
      `INSERT INTO intentosVerificacion (idCliente, exitoso, fechaIntentoVerificacion)
       VALUES (?, 1, NOW())`,
      [idCliente]
    );

    await connection.query(
      `DELETE FROM intentosVerificacion
       WHERE idCliente = ? AND fechaIntentoVerificacion < DATE_SUB(NOW(), INTERVAL 1 DAY)`,
      [idCliente]
    );

    await connection.commit();
    (`Verificación exitosa - Cliente ${idCliente}`);

    // Generar token fuera de la transacción (ya hicimos commit)
    const payload = { id: idCliente, rol: rol || "cliente" };
    const tokenWeb = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const user = { id: idCliente, rol: rol || "cliente" };
    return res.status(200).json({ message: "Verificación exitosa", tokenWeb, JWT_EXPIRES_IN, user });

  } catch (error) {
    console.error("ERROR en verificarToken:", error);
    try { if (connection) await connection.rollback(); } catch (e) { console.error("Rollback falló:", e); }
    return res.status(500).json({ error: "Error al verificar código" });
  } finally {
    if (connection) {
      try { connection.release(); } catch (e) { /* no-op */ }
    }
  }
};
