import jwt from "jsonwebtoken";


export function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    }
    catch (err) {
        console.error('Token verification failed:', err);
        return null;
    }
}