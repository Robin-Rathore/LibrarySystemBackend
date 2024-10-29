import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();


export const authorize = (roles = []) => {
    return (req, res, next) => {
        const token = req.headers['authorization']?.split(' ')[1];

        if(!token) {
            return res.sendStatus(403);
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if(err){
                return res.sendStatus(403);
            }

            if(roles.length() && ! roles.includes(decoded.role)){
                return res.sendStatus(403);
            }
            req.user = decoded;
            next();
        });
    }
}