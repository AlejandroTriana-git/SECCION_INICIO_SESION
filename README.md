
# API de Autenticación - SECCION_INICIO_SESION

**Proyecto**: Módulo / sección — API REST de autenticación en Node.js

---

## Descripción

Este repositorio contiene un módulo (sección) que implementa un **API REST de autenticación** hecho con **Node.js** y **Express** El objetivo es proporcionar un sistema de registro y login de usuarios con generación y validación de tokens (JWT), protección de rutas y buenas prácticas mínimas de seguridad.

---

## Características principales

* Registro de usuarios con validación y verificación de duplicados.
* Hash de contraseñas con `bcrypt` (no se guarda contraseña en texto plano).
* Login con comparación de contraseña y generación de token firmado (`JWT`).
* Rutas protegidas que requieren `Authorization: Bearer <token>`.
* Manejo de errores controlado con códigos HTTP.
* Variables de entorno en archivo `.env` (incluido en `.gitignore`).

---

## Tecnologías usadas

* Node.js
* Express
* Base de datos: SQL (MySQL).
* bcrypt
* jsonwebtoken (JWT)
* dotenv

---

## Variables de entorno (ejemplo)


```
DB_HOST=localhost
DB_USER=root
DB_PASS=tu_clave
DB_NAME=name
PORT=3000
JWT_SECRET=clave_secreta_segura

```


## Estructura mínima sugerida

```
src/
├── config/           # configuración (DB, dotenv)
├── controllers/      # controladores (requests -> services)
├── routes/           # rutas express
├── models/           # modelos / esquemas de BD
├── middlewares/      # autenticación, validaciones, manejo de errores
└── server.js         # punto de entrada (configura express y rutas)

package.json
README.md
.env
```

---

## Base de datos

-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema mydb2
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema mydb2
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `mydb2` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci ;
USE `mydb2` ;

-- -----------------------------------------------------
-- Table `mydb2`.`cliente`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb2`.`cliente` (
  `idCliente` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `correo` VARCHAR(255) NOT NULL,
  `rol` ENUM('cliente', 'admin') NOT NULL DEFAULT 'cliente',
  `contraseña` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`idCliente`),
  UNIQUE INDEX `correo_UNIQUE` (`correo` ASC) VISIBLE)
ENGINE = InnoDB
AUTO_INCREMENT = 3
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `mydb2`.`intentosverificacion`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb2`.`intentosverificacion` (
  `idIntentosVerificacion` INT NOT NULL AUTO_INCREMENT,
  `idCliente` INT UNSIGNED NOT NULL,
  `exitoso` TINYINT NOT NULL,
  `bloqueado` TINYINT NOT NULL DEFAULT '0',
  `fechaIntentoVerificacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idIntentosVerificacion`),
  INDEX `idCliente` (`idCliente` ASC) VISIBLE,
  CONSTRAINT `intentosverificacion_ibfk_1`
    FOREIGN KEY (`idCliente`)
    REFERENCES `mydb2`.`cliente` (`idCliente`)
    ON UPDATE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 23
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `mydb2`.`reserva`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb2`.`reserva` (
  `idReserva` INT NOT NULL AUTO_INCREMENT,
  `idCliente` INT UNSIGNED NOT NULL,
  `fechaReserva` DATETIME NOT NULL,
  `estado` TINYINT NOT NULL DEFAULT '1',
  PRIMARY KEY (`idReserva`),
  INDEX `idCliente` (`idCliente` ASC) VISIBLE,
  CONSTRAINT `reserva_ibfk_1`
    FOREIGN KEY (`idCliente`)
    REFERENCES `mydb2`.`cliente` (`idCliente`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 2
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;


---

## Endpoints (mínimos documentados)

### 1) Registro de usuario

* **Endpoint**: `POST /api/auth/register`
* **Descripción**: Crea un nuevo usuario, valida datos, verifica que no exista y guarda el `passwordHash`.
* **Request body (JSON)**:

```json
{
  "nombre": "Juan Perez",
  "email": "juan@example.com",
  "password": "MiClaveSegura123"
}
```

* **Respuestas**:

  * `201 Created` (registro exitoso)
  * `400 Bad Request` (validación de datos)
  * `409 Conflict` (usuario ya existe)

### 2) Login

* **Endpoint**: `POST /api/auth/login`
* **Descripción**: Valida credenciales, compara contraseña con `bcrypt`, genera token JWT firmado.
* **Request body (JSON)**:

```json
{
  "email": "juan@example.com",
  "password": "MiClaveSegura123"
}
```

* **Respuesta exitosa (200)**:

```json
{
  "ok": true,
  "token": "<JWT_TOKEN>",
  "expiresIn": "1d"
}
```

* Códigos: `400` (datos inválidos), `401` (credenciales inválidas)

### 3) Ruta protegida (perfil de usuario)

* **Endpoint**: `GET /api/profile`
* **Cabecera**: `Authorization: Bearer <JWT_TOKEN>`
* **Descripción**: Valida token y retorna datos del usuario autenticado.
* **Respuestas**:

  * `200 OK` (retorna perfil)
  * `401 Unauthorized` (sin token)
  * `403 Forbidden` (token inválido/expirado)

**Ejemplo (curl)**:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" http://localhost:3000/api/profile
```

---

## Ejemplo rápido (curl)

1. Registro

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Juan","email":"juan@example.com","password":"MiClave123"}'
```

2. Login (recibirás un token)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@example.com","password":"MiClave123"}'
```

Respuesta ejemplo:

```json
{
  "ok": true,
  "token": "eyJhbGciOiJI...",
  "expiresIn": "1d"
}
```

3. Acceder a ruta protegida

```bash
curl -H "Authorization: Bearer eyJhbGciOiJI..." \
  http://localhost:3000/api/profile
```

---

## Manejo de errores y formato de respuesta

Las respuestas de error deben seguir un formato consistente, por ejemplo:

```json
{
  "ok": false,
  "message": "Credenciales inválidas",
  "errors": [ ... ]
}
```

Mapeo básico de códigos:

* `400` – Error de validación
* `401` – No autenticado (sin token)
* `403` – Token inválido / sin permisos
* `404` – Ruta no encontrada
* `500` – Error interno

---

## Seguridad mínima implementada

* Contraseñas hasheadas con `bcrypt` antes de persistir.
* Validación de payloads (ej. `express-validator` o Joi) para evitar datos inválidos.
* Manejo centralizado de errores (no exponer stacktrace en producción).
* Uso de variables de entorno para secretos (`JWT_SECRET`) y credenciales.
* No devolver información sensible en las respuestas (ej., nunca devolver `passwordHash`).
* Uso correcto de header `Authorization: Bearer <token>`.

---

## Pruebas obligatorias (colección Postman / Insomnia)

Adjuntar en el repositorio una colección con pruebas que demuestren los siguientes casos:

1. Registro exitoso
2. Registro duplicado
3. Login correcto
4. Login incorrecto
5. Acceso sin token a ruta protegida
6. Acceso con token inválido
7. Acceso con token válido

**Consejo**: guarda la colección en `postman/Autenticacion-api.postman_collection.json` o `insomnia/Autenticacion-api.json`.

---

## Cómo ejecutar el proyecto (ejemplo)

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env` con las variables necesarias (ver sección arriba).

3. Ejecutar en modo desarrollo:

```bash
npm run dev    # si usas nodemon
# o
npm start
```

4. Abrir `http://localhost:3000` (o el puerto configurado).

---

## Notas finales / Recomendaciones

* Selecciona una base de datos (MongoDB si quieres usar `mongoose`, MySQL/Postgres si prefieres SQL y `sequelize`).
* Implementa pruebas unitarias e integradas si el tiempo lo permite.
* Añade rate limiting y protección contra fuerza bruta para endpoints de login en producción.

---

## Licencia

MIT

---

*Archivo generado como README sugerido para la evidencia. Si quieres que lo adapte exactamente a una implementación con MongoDB o MySQL (incluyendo ejemplos de `models/` y comandos `npm`), o que genere la colección Postman automáticamente, dime y la genero.*
