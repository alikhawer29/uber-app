/** Strip whitespace and optional surrounding quotes from .env values. */
export function cleanMailEnv(value?: string): string | undefined {
    if (value == null || value === '') return undefined;
    let v = value.trim();
    if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
    ) {
        v = v.slice(1, -1).trim();
    }
    return v || undefined;
}

export type ResolvedMailConfig = {
    host: string;
    port: number;
    secure: boolean;
    requireTLS: boolean;
    user: string;
    pass: string;
    from: string;
    fromName: string;
};

export function resolveMailConfig(appName: string): ResolvedMailConfig | null {
    const user = cleanMailEnv(
        process.env.MAIL_USERNAME || process.env.EMAIL_USER,
    );
    const pass = cleanMailEnv(
        process.env.MAIL_PASSWORD ||
            process.env.EMAIL_PASSWORD ||
            process.env.EMAIL_PASS,
    );
    if (!user || !pass) return null;

    const port = parseInt(process.env.MAIL_PORT || process.env.EMAIL_PORT || '587', 10);
    // Port drives TLS mode (Gmail/Zoho): 587 = STARTTLS, 465 = implicit SSL.
    // MAIL_ENCRYPTION=ssl with port 587 is common in Laravel .env but must not set secure=true.
    let secure = false;
    let requireTLS = true;
    if (port === 465) {
        secure = true;
        requireTLS = false;
    } else if (process.env.EMAIL_SECURE === 'true') {
        secure = true;
        requireTLS = false;
    }

    const fromNameRaw = process.env.MAIL_FROM_NAME;
    const fromName =
        fromNameRaw && fromNameRaw !== '${APP_NAME}'
            ? cleanMailEnv(fromNameRaw) || appName
            : appName;

    return {
        host:
            cleanMailEnv(process.env.MAIL_HOST || process.env.EMAIL_HOST) ||
            'smtp.gmail.com',
        port,
        secure,
        requireTLS,
        user,
        pass,
        from:
            cleanMailEnv(process.env.MAIL_FROM_ADDRESS || process.env.EMAIL_FROM) || user,
        fromName: fromName || appName,
    };
}
