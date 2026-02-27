import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ICreateUserDTO, ILoginDTO, IUser, IAuthPayload } from '../interfaces';
import { UserService } from './user.service';
import { KarmaService } from './karma.service';
import { UnauthorizedError, BlacklistedError } from '../helpers/errors';

export class AuthService {
    private userService: UserService;
    private karmaService: KarmaService;

    constructor(userService?: UserService, karmaService?: KarmaService) {
        this.userService = userService || new UserService();
        this.karmaService = karmaService || new KarmaService();
    }

    /**
     * Register a new user.
     * 1. Check karma blacklist
     * 2. Hash password
     * 3. Create user + wallet
     * 4. Return user data + faux token
     */
    async register(data: ICreateUserDTO): Promise<{ user: Omit<IUser, 'password'>; token: string }> {
        // Check karma blacklist before onboarding
        const isBlacklisted = await this.karmaService.isBlacklisted(data.email);
        if (isBlacklisted) {
            throw new BlacklistedError();
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        // Create user with hashed password
        const user = await this.userService.create({
            ...data,
            password: hashedPassword,
        });

        // Generate faux token
        const token = this.generateToken({ userId: user.id!, email: user.email });

        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, token };
    }

    /**
     * Login a user with email and password.
     * Returns user data and a faux token.
     */
    async login(data: ILoginDTO): Promise<{ user: Omit<IUser, 'password'>; token: string }> {
        const user = await this.userService.findByEmail(data.email);

        const isPasswordValid = await bcrypt.compare(data.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const token = this.generateToken({ userId: user.id!, email: user.email });

        const { password, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, token };
    }

    /**
     * Generate a faux token.
     * This is a simple base64-encoded JSON token (NOT a real JWT, as specified).
     * In production, use a proper JWT library.
     */
    generateToken(payload: IAuthPayload): string {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const body = Buffer.from(
            JSON.stringify({
                ...payload,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
            })
        ).toString('base64url');
        const secret = process.env.JWT_SECRET || 'demo-credit-secret-key-2024';
        const signature = crypto
            .createHmac('sha256', secret)
            .update(`${header}.${body}`)
            .digest('base64url');

        return `${header}.${body}.${signature}`;
    }

    /**
     * Verify and decode a faux token.
     */
    verifyToken(token: string): IAuthPayload {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new UnauthorizedError('Invalid token format');
            }

            const [header, body, signature] = parts;
            const secret = process.env.JWT_SECRET || 'demo-credit-secret-key-2024';

            // Verify signature
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(`${header}.${body}`)
                .digest('base64url');

            if (signature !== expectedSignature) {
                throw new UnauthorizedError('Invalid token signature');
            }

            // Decode payload
            const payload = JSON.parse(Buffer.from(body, 'base64url').toString());

            // Check expiration
            if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
                throw new UnauthorizedError('Token has expired');
            }

            return { userId: payload.userId, email: payload.email };
        } catch (error) {
            if (error instanceof UnauthorizedError) throw error;
            throw new UnauthorizedError('Invalid token');
        }
    }
}

export default new AuthService();
