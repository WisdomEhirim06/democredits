import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { UnauthorizedError } from '../helpers/errors';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: number;
                email: string;
            };
        }
    }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('No token provided');
        }

        const token = authHeader.split(' ')[1];
        const payload = authService.verifyToken(token);

        req.user = payload;
        next();
    } catch (error) {
        next(error);
    }
}
