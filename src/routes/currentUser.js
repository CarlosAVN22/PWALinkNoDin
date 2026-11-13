import { Router } from "express";
import { getCurrentUser } from "../controllers/currentUserController.js";
import { createUserAuth } from "../middleware/userAuth.js";

export function createCurrentUserRouter(options) {
    const router = Router();
    router.get("/", createUserAuth(options), getCurrentUser);
    return router;
}
