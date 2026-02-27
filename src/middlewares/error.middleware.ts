import { Request, Response, NextFunction } from 'express';
import { AppError } from '../helpers/errors';
import { errorResponse } from '../helpers/response';

export function errorMiddleware(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    if (err instanceof AppError) {
        errorResponse(res, err.message, err.statusCode);
        return;
    }

    // Unexpected errors
    console.error('Unexpected error:', err);
    errorResponse(res, 'Internal server error', 500);
}
