/** Mask FCM token for logs (first/last 6 chars). */
export function maskFcmToken(token: string): string {
    if (!token || token.length < 16) return '(invalid-token)';
    return `${token.slice(0, 6)}…${token.slice(-6)}`;
}
