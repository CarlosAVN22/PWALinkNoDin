//Importamos express framework para rutas y peticiones 
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

//Importamos dotenv para variables de entorno
import dotenv from "dotenv";
dotenv.config();

//Importamos el router de usuarios 
import userRoutes from "./routes/user.js";

//Creamos la instancia de express
const app = express();
const publicPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

//Permite interpretar JSON en las peticiones
app.use(express.json());
app.use(express.static(publicPath));

//Definimos una ruta GET para la raíz del servidor
app.get("/", (req, res) => {
    res.sendFile(path.join(publicPath, "doc", "general", "index.html"));
});

//Asociamos todas las rutas de usuarios al prefijo /users
app.use("/users", userRoutes);

//Iniciamos el servidor en el puerto definido en las variables de entorno
//de lo contrario, se usará el puerto 3000
app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en el puerto ${process.env.PORT || 3000}`);
});