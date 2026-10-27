//Importamos Router desde express para crear un conjunto de rutas
import { Router } from "express";

//Importamos los metodos que definimos en services 
import { getAllUsers } from "../services/userServices.js";

//Creamos una instancia de Router 
const router = Router();

//Ruta para obtener todos los usuarios GET 
router.get("/", getAllUsers);

//Exportamos el router para usarlo en index.js
export default router;