export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

export class ValidationError extends AppError {
    constructor(message = 'Validation error') {
        super(message, 400);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

export class InsufficientFundsError extends AppError {
    constructor(message = 'Insufficient funds') {
        super(message, 400);
        Object.setPrototypeOf(this, InsufficientFundsError.prototype);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

export class BlacklistedError extends AppError {
    constructor(message = 'User is blacklisted and cannot be onboarded') {
        super(message, 403);
        Object.setPrototypeOf(this, BlacklistedError.prototype);
    }
}
