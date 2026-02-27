import db from '../database/connection';
import { IUser, ICreateUserDTO } from '../interfaces';
import { ConflictError, NotFoundError } from '../helpers/errors';

export class UserService {
    /**
     * Create a new user and their associated wallet within a transaction.
     */
    async create(userData: ICreateUserDTO): Promise<IUser> {
        const existingUser = await this.findByEmail(userData.email).catch(() => null);
        if (existingUser) {
            throw new ConflictError('A user with this email already exists');
        }

        const [userId] = await db.transaction(async (trx) => {
            const [id] = await trx('users').insert({
                email: userData.email,
                first_name: userData.first_name,
                last_name: userData.last_name,
                password: userData.password,
            });

            await trx('wallets').insert({
                user_id: id,
                balance: 0.00,
            });

            return [id];
        });

        const user = await this.findById(userId);
        return user;
    }

    /**
     * Find a user by their email address.
     */
    async findByEmail(email: string): Promise<IUser> {
        const user = await db('users').where({ email }).first();
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return user;
    }

    /**
     * Find a user by their ID.
     */
    async findById(id: number): Promise<IUser> {
        const user = await db('users').where({ id }).first();
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return user;
    }
}

export default new UserService();
