import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FirebaseService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseService.name);
    private app: admin.app.App | null = null;

    constructor(private readonly configService: ConfigService) { }

    async onModuleInit() {
        await this.initializeFirebase();
    }

    private async initializeFirebase(): Promise<void> {
        try {
            // Check if Firebase is already initialized
            if (admin.apps.length > 0) {
                this.app = admin.apps[0];
                this.logger.log('Firebase Admin SDK already initialized');
                return;
            }

            // Get service account configuration
            const serviceAccountJson = this.configService.get<string>('firebase.serviceAccountJson');
            const serviceAccountPath = this.configService.get<string>('firebase.serviceAccountPath');

            if (!serviceAccountJson && !serviceAccountPath) {
                this.logger.warn('Firebase service account not configured. Push notifications will not work.');
                this.logger.warn('Please set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH in .env');
                return;
            }

            let serviceAccountRaw: any;

            if (serviceAccountPath) {
                const absolutePath = this.resolveServiceAccountPath(serviceAccountPath);
                if (!absolutePath) {
                    throw new Error(
                        `Firebase service account file not found. Tried path "${serviceAccountPath}" under cwd=${process.cwd()}`,
                    );
                }

                try {
                    const fileContent = fs.readFileSync(absolutePath, 'utf8');
                    serviceAccountRaw = JSON.parse(fileContent);
                    this.logger.log(`[FCM] Loaded service account from: ${absolutePath}`);
                } catch (error: any) {
                    this.logger.error(`[FCM] Failed to read service account file: ${error.message}`);
                    throw new Error(`Failed to read Firebase service account file: ${error.message}`);
                }
            } else if (serviceAccountJson) {
                // Parse from JSON string
                try {
                    serviceAccountRaw = typeof serviceAccountJson === 'string'
                        ? JSON.parse(serviceAccountJson)
                        : serviceAccountJson;
                } catch (error) {
                    this.logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error);
                    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON format. Must be valid JSON.');
                }
            } else {
                throw new Error('Firebase service account configuration is missing');
            }

            // Normalize service account: Firebase JSON uses snake_case, but TypeScript type expects camelCase
            // Handle both formats for compatibility
            const serviceAccount: admin.ServiceAccount = {
                projectId: serviceAccountRaw.projectId || serviceAccountRaw.project_id,
                privateKey: serviceAccountRaw.privateKey || serviceAccountRaw.private_key?.replace(/\\n/g, '\n'),
                clientEmail: serviceAccountRaw.clientEmail || serviceAccountRaw.client_email,
            };

            // Validate required fields (check both formats)
            if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
                throw new Error('Firebase service account is missing required fields (projectId/project_id, privateKey/private_key, clientEmail/client_email)');
            }

            // Initialize Firebase Admin SDK
            this.app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });

            this.logger.log(
                `[FCM] Admin SDK initialized — projectId=${serviceAccount.projectId} clientEmail=${serviceAccount.clientEmail}`,
            );
        } catch (error: any) {
            this.logger.error(`[FCM] Failed to initialize Admin SDK: ${error.message}`);
            this.logger.error('[FCM] Push notifications will be DISABLED until configuration is fixed');
        }
    }

    /** Resolve service account path (cwd, dist parent, default filename). */
    private resolveServiceAccountPath(configuredPath: string): string | null {
        const candidates = [
            configuredPath,
            path.isAbsolute(configuredPath)
                ? configuredPath
                : path.resolve(process.cwd(), configuredPath),
            path.resolve(process.cwd(), 'firebase-service-account.json'),
            path.resolve(__dirname, '../../../firebase-service-account.json'),
            path.resolve(__dirname, '../../../../firebase-service-account.json'),
        ];
        for (const candidate of candidates) {
            if (candidate && fs.existsSync(candidate)) {
                return candidate;
            }
        }
        this.logger.warn(
            `[FCM] Service account not found. cwd=${process.cwd()} configured="${configuredPath}"`,
        );
        return null;
    }

    /**
     * Get Firebase Admin app instance
     */
    getApp(): admin.app.App | null {
        return this.app;
    }

    /**
     * Check if Firebase is initialized
     */
    isInitialized(): boolean {
        return this.app !== null;
    }

    /**
     * Get Firebase Messaging instance
     */
    getMessaging(): admin.messaging.Messaging | null {
        if (!this.app) {
            this.logger.warn('Firebase is not initialized. Cannot get messaging instance.');
            return null;
        }
        return admin.messaging(this.app);
    }
}

