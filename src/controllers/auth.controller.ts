import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { successResponse } from '../helpers/response';

export class AuthController {
    /**
     * POST /api/auth/register
     */
    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, first_name, last_name, password } = req.body;
            const result = await authService.register({
                email,
                first_name,
                last_name,
                password,
            });

            successResponse(res, 'User registered successfully', result, 201);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/login
     */
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password } = req.body;
            const result = await authService.login({ email, password });

            successResponse(res, 'Login successful', result);
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthController();
