//Importamos el pg que nos permite conectarnos a la base de datos PostgreSQL
import pg from "pg";

//Importamos dotenv para leer la variables de entorno del .env
import dotenv from "dotenv";

//Cargamos la variable de enterno del archivo .env
dotenv.config();

//Extraemos la clase POOL del pg para crear un pool de conexiones a la base de datos
const { Pool } = pg;

//Creamos un pool de conexiones a la base de datos con los datos de conexión
export const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});
