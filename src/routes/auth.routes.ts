import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';

const router = Router();

router.post(
    '/register',
    validate({
        email: { required: true, type: 'email' },
        first_name: { required: true, type: 'string', min: 1, max: 100 },
        last_name: { required: true, type: 'string', min: 1, max: 100 },
        password: { required: true, type: 'string', min: 6 },
    }),
    authController.register
);

router.post(
    '/login',
    validate({
        email: { required: true, type: 'email' },
        password: { required: true, type: 'string' },
    }),
    authController.login
);

export default router;
