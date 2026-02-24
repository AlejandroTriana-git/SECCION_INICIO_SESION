import jwt from "jsonwebtoken";



export const verificarTokenJWT = (req, res, next) => {
  try {
    console.log("HEADERS:", req.headers.authorization);

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Token no enviado" });
    }

    const token = authHeader.split(" ")[1];
    console.log("TOKEN RECIBIDO:", token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = decoded;
    next();
  } catch (error) {
    console.error("ERROR JWT:", error.message);
    return res.status(401).json({ error: "Token no válido o expirado" });
  }
};
