//Importamos el POOL de la base de datos para realizar consultas
import { pool } from "../db.js";

//Obtenemos todos los usuarios de la base de datos
export const getAllUsers = async (req, res) => {
    try {
        const response = await pool.query("SELECT * FROM usuarios"); //Ejecutamos la consulta 
        res.json(response.rows); //Devolvemos solo las filas de la respuesta en formato JSON
    } catch (err) {
        res.status(500).json({ error: err.message }); //En caso de error, devolvemos un error 500 con el mensaje del error
    }
}

