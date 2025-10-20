-- Inicialización de tablas para microservicios

CREATE DATABASE IF NOT EXISTS microservices;
USE microservices;

-- Tokens para microservicio de seguridad
CREATE TABLE IF NOT EXISTS tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(16) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid TINYINT(1) DEFAULT 1
);

-- Clientes
CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parámetros globales
CREATE TABLE IF NOT EXISTS params (
  id INT AUTO_INCREMENT PRIMARY KEY,
  param_key VARCHAR(100) NOT NULL UNIQUE,
  param_value VARCHAR(255) NOT NULL
);

-- Correos enviados (registro)
CREATE TABLE IF NOT EXISTS mails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT,
  to_email VARCHAR(255),
  subject VARCHAR(255),
  body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar un parámetro por defecto: enable_emails = true
INSERT INTO params (param_key, param_value) VALUES ('enable_emails', 'true')
ON DUPLICATE KEY UPDATE param_value = VALUES(param_value);

