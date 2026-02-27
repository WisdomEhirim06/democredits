import { Response } from 'express';

export interface ApiResponse<T = unknown> {
    status: 'success' | 'error';
    message: string;
    data?: T;
}

export function successResponse<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode = 200
): Response<ApiResponse<T>> {
    return res.status(statusCode).json({
        status: 'success',
        message,
        data,
    });
}

export function errorResponse(
    res: Response,
    message: string,
    statusCode = 500,
    data?: unknown
): Response<ApiResponse> {
    return res.status(statusCode).json({
        status: 'error',
        message,
        data,
    });
}
