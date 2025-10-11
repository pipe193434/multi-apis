-- 1) Crear un esquema específico para Users
    CREATE SCHEMA IF NOT EXISTS users_schema AUTHORIZATION pipeadmin;
    -- 2) Crear la tabla dentro del esquema
    CREATE TABLE IF NOT EXISTS users_schema.users (
    id SERIAL PRIMARY KEY,
    name  TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
    );
    -- 3) (Opcional) Dar privilegios al usuario administrador
    GRANT ALL PRIVILEGES ON SCHEMA users_schema TO pipeadmin;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA users_schema TO pipeadmin;



     -- 1) Crear un esquema específico para Users
 CREATE SCHEMA IF NOT EXISTS products_schema AUTHORIZATION pipeadmin;
 -- 2) Crear la tabla dentro del esquema
 CREATE TABLE IF NOT EXISTS products_schema.products (
 id SERIAL PRIMARY KEY,
 name  TEXT NOT NULL,
 precio TEXT UNIQUE NOT NULL
 );
 -- 3) (Opcional) Dar privilegios al usuario administrador
 GRANT ALL PRIVILEGES ON SCHEMA products_schema TO pipeadmin;
 GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA products_schema TO pipeadmin;