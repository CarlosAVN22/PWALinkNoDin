import { getCurrentUserProfile } from "../services/currentUserService.js";

export async function getCurrentUser(req, res, next) {
    try {
        const profile = await getCurrentUserProfile(req.userContext);
        res.json({ data: profile });
    } catch (error) {
        next(error);
    }
}
