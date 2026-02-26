
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

## Variables de entorno 

Crea un archivo .env en el directorio /backend con los siguientes valores:

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

* **Endpoint**: `POST /clientes/crearUsuario`
* **Descripción**: Crea un nuevo usuario, valida datos, verifica que no exista y guarda el `passwordHash`.
* **Request body (JSON)**:

```json
{
  "nombre": "Juan Perez",
  "correo": "juan@example.com",
  "constraseña": "MiClaveSegura123"
}
```


### 2) Login

* **Endpoint**: `POST /auth/verificar`
* **Descripción**: Valida credenciales, compara contraseña con `bcrypt`, genera token JWT firmado.
* **Request body (JSON)**:

```json
{
  "correo": "juan@example.com",
  "contraseña": "MiClaveSegura123"
}
```


### 3) Ruta protegida (perfil de usuario)

* **Endpoint**: `GET /reservas/reservas`
* **Cabecera**: `Authorization: Bearer <JWT_TOKEN>`
* **Descripción**: Valida token y retorna datos o ruta que el usuario solicito.


---


## Licencia

MIT, Autor: Jose Alejandro Triana Velasquez

---
