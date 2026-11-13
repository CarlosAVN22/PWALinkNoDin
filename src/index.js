import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.API_PORT || 3001);
const app = createApp();

const server = app.listen(port, () => {
    console.log(`API lista en http://localhost:${port}`);
});

server.on("error", async error => {
    console.error("No se pudo iniciar la API:", error);
    process.exitCode = 1;
});