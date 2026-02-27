import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../helpers/errors';

type ValidationSchema = Record<string, {
    required?: boolean;
    type?: 'string' | 'number' | 'email';
    min?: number;
    max?: number;
}>;

/**
 * Middleware factory that validates request body against a schema.
 */
export function validate(schema: ValidationSchema) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const errors: string[] = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            // Check required
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            // Skip remaining checks if value is not present and not required
            if (value === undefined || value === null) continue;

            // Check type
            if (rules.type === 'string' && typeof value !== 'string') {
                errors.push(`${field} must be a string`);
            }

            if (rules.type === 'number') {
                const numValue = Number(value);
                if (isNaN(numValue)) {
                    errors.push(`${field} must be a number`);
                } else {
                    if (rules.min !== undefined && numValue < rules.min) {
                        errors.push(`${field} must be at least ${rules.min}`);
                    }
                    if (rules.max !== undefined && numValue > rules.max) {
                        errors.push(`${field} must be at most ${rules.max}`);
                    }
                }
            }

            // Check email format
            if (rules.type === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (typeof value !== 'string' || !emailRegex.test(value)) {
                    errors.push(`${field} must be a valid email`);
                }
            }

            // Check min/max length for strings
            if (rules.type === 'string' && typeof value === 'string') {
                if (rules.min !== undefined && value.length < rules.min) {
                    errors.push(`${field} must be at least ${rules.min} characters`);
                }
                if (rules.max !== undefined && value.length > rules.max) {
                    errors.push(`${field} must be at most ${rules.max} characters`);
                }
            }
        }

        if (errors.length > 0) {
            next(new ValidationError(errors.join('; ')));
            return;
        }

        next();
    };
}
