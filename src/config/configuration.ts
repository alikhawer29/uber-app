export default () => {
    const appName = process.env.APP_NAME || 'Vilaire Valcin';

    // Resolve email "from" name:
    // - Prefer MAIL_FROM_NAME when it's set and not literally '${APP_NAME}'
    // - Otherwise fall back to APP_NAME
    const mailFromNameEnv = process.env.MAIL_FROM_NAME;
    const resolvedFromName =
        mailFromNameEnv && mailFromNameEnv !== '${APP_NAME}'
            ? mailFromNameEnv
            : appName || 'Vilaire Valcin';

    return ({
        app: {
            name: appName,
            env: process.env.NODE_ENV || 'development',
            port: parseInt(process.env.PORT || '3000', 10),
            url: process.env.APP_URL || 'http://localhost:3000',
        },
        database: {
            mongodb: {
                uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/file-management',
            },
        },
        jwt: {
            secret: process.env.JWT_SECRET || 'default-jwt-secret',
            expiresIn: process.env.JWT_EXPIRES_IN || '15m',
            refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
            refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        },
        upload: {
            path: process.env.UPLOAD_PATH || './uploads',
            maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
        },
        email: {
            // Use Laravel-style environment variables with fallbacks
            host: process.env.MAIL_HOST || process.env.EMAIL_HOST || 'smtppro.zoho.com',
            port: parseInt(process.env.MAIL_PORT || process.env.EMAIL_PORT || '587', 10),
            secure: process.env.MAIL_ENCRYPTION === 'ssl' || process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.MAIL_USERNAME || process.env.EMAIL_USER,
                pass: process.env.MAIL_PASSWORD || process.env.EMAIL_PASS,
            },
            from: process.env.MAIL_FROM_ADDRESS || process.env.EMAIL_FROM || 'custom-dev@onlinetestingserver.com',
            fromName: resolvedFromName,
        },
        stripe: {
            secretKey: process.env.STRIPE_SECRET_KEY,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        },
        google: {
            // Google Cloud / OAuth credentials for Business Profile (Google Reviews)
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Redirect URI must match what you configure in Google Cloud Console
            redirectUri:
                process.env.GOOGLE_REDIRECT_URI ||
                `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/admin/google/oauth2/callback`,
            // Optional: API key if you ever need Places API as well
            apiKey: process.env.GOOGLE_API_KEY,
        },
        zoom: {
            // Video SDK credentials for client-side JWT token generation
            // Can use either ZOOM_SDK_KEY or ZOOM_VIDEO_SDK_KEY (official naming)
            sdkKey: process.env.ZOOM_VIDEO_SDK_KEY || process.env.ZOOM_SDK_KEY,
            sdkSecret: process.env.ZOOM_VIDEO_SDK_SECRET || process.env.ZOOM_SDK_SECRET,
        },
        cron: {
            secret: process.env.CRON_SECRET || 'default-cron-secret-change-in-production',
        },
        firebase: {
            // Firebase service account JSON (can be provided as string or file path)
            // Option 1: JSON string (escape quotes or use base64)
            serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
            // Option 2: Path to service account JSON file
            serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        },
    });
}