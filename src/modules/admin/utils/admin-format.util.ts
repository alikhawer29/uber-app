function fullNameFromUser(u: any): string {
    if (!u || typeof u !== 'object') return '';
    const first = u.firstName ?? '';
    const last = u.lastName ?? '';
    return `${first} ${last}`.trim();
}

function avatarFromUser(u: any): string | null {
    if (!u || typeof u !== 'object') return null;
    return u.avatar ?? u.avatarFile?.path ?? u.avatarFile?.url ?? null;
}

function phoneFromUser(u: any): string | null {
    if (!u || typeof u !== 'object') return null;
    const code = u.countryCode ? String(u.countryCode).trim() : '';
    const phone = u.phone ? String(u.phone).trim() : '';
    if (code && phone) return `${code} ${phone}`.trim();
    return phone || code || null;
}

export function mapPopulatedUser(u: any) {
    if (!u) return null;
    const id = u._id?.toString?.() ?? (typeof u === 'string' ? u : null);
    if (typeof u !== 'object') {
        return { id, name: null, email: null, phone: null, avatar: null };
    }
    return {
        id,
        name: fullNameFromUser(u),
        email: u.email ?? null,
        phone: phoneFromUser(u),
        avatar: avatarFromUser(u),
    };
}

export function formatPaymentMethodLabel(paymentType?: string | null): string {
    switch (paymentType) {
        case 'cash':
            return 'Pay With Cash';
        case 'card':
            return 'Pay With Card';
        case 'wallet':
            return 'Pay With Wallet';
        default:
            return paymentType ? String(paymentType) : 'Unknown';
    }
}
