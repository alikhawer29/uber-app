import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserRepository } from '../shared/repositories/user.repository';
import { UserRole } from '../common/constants/user.constants';
import { UserStatus } from '../common/constants/user.constants';
import * as bcrypt from 'bcryptjs';

async function bootstrap() {
    const email = (process.env.ADMIN_EMAIL || 'admin@vilairevalcin.local').toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD || 'Admin123!@#aA';
    const firstName = process.env.ADMIN_FIRST_NAME || 'Admin';
    const lastName = process.env.ADMIN_LAST_NAME || 'User';

    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
    const userRepository = app.get(UserRepository);

    const existing = await userRepository.findByEmail(email);
    if (existing) {
        if (String(existing.role) === UserRole.ADMIN || String(existing.role) === 'admin') {
            console.log(`Admin already exists (${email}). No changes made.`);
            await app.close();
            return;
        }
        console.error(`Email ${email} is already registered with a non-admin role. Choose ADMIN_EMAIL or remove the user.`);
        await app.close();
        process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await userRepository.create({
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
    });

    console.log(`Admin user created: ${email}`);
    console.log('Set ADMIN_EMAIL / ADMIN_PASSWORD in the environment for production.');
    await app.close();
}

bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
