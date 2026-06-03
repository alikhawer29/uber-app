/** Base URL for public assets (APP_URL). No trailing slash. */
export function getAppBaseUrl(): string {
    return (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

const UPLOAD_PATH_PREFIX = '/uploads/';
const BARE_UPLOAD_FILENAME = /^[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|gif|webp|pjpeg|pdf)$/i;

/**
 * Turn a stored upload path or filename into an absolute URL.
 * - Already http(s) → unchanged
 * - /uploads/... or uploads/... → APP_URL + path
 * - bare filename.ext (e.g. avatar in DB) → APP_URL/uploads/filename
 */
export function resolvePublicAssetUrl(value: string | null | undefined): string | null {
    if (value == null || value === '') {
        return value ?? null;
    }
    const s = value.trim();
    if (s.startsWith('http://') || s.startsWith('https://')) {
        return s;
    }
    const base = getAppBaseUrl();
    if (s.startsWith(UPLOAD_PATH_PREFIX)) {
        return `${base}${s}`;
    }
    if (s.startsWith('uploads/')) {
        return `${base}/${s}`;
    }
    if (BARE_UPLOAD_FILENAME.test(s) && !s.includes('@')) {
        return `${base}${UPLOAD_PATH_PREFIX}${s}`;
    }
    return s;
}

export function resolvePublicAssetUrls(
    values: string[] | null | undefined,
): string[] {
    if (!values?.length) return [];
    return values.map((v) => resolvePublicAssetUrl(v) ?? v);
}

/** Recursively resolve upload paths in API response payloads. */
export function resolvePublicUrlsDeep<T>(value: T): T {
    if (value == null) {
        return value;
    }
    if (typeof value === 'string') {
        return resolvePublicAssetUrl(value) as T;
    }
    if (Array.isArray(value)) {
        return value.map((item) => resolvePublicUrlsDeep(item)) as T;
    }
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
            out[key] = resolvePublicUrlsDeep(child);
        }
        return out as T;
    }
    return value;
}
