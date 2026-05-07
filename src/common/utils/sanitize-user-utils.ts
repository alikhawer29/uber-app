export class sanitizeUserUtils {
    /** Same default as `configuration.ts` `app.url`. */
    private static readonly defaultAppUrl = 'http://localhost:3000';

    /**
     * Absolute URL for the avatar (APP_URL + path). If `avatar` is already http(s), mirrors it.
     */
    private static resolveAvatarUrl(avatar: string | null | undefined): string | null {
        if (avatar == null || avatar === '') {
            return null;
        }
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            return avatar;
        }
        const base = (process.env.APP_URL || sanitizeUserUtils.defaultAppUrl).replace(/\/+$/, '');
        const path = avatar.startsWith('/') ? avatar : `/${avatar}`;
        return `${base}${path}`;
    }

    static sanitizeUser(user: any) {
        if (!user) return null;

        const userObj = user.toObject ? user.toObject() : user;

        // Transform _id to id
        if (userObj._id && typeof userObj._id === 'object') {
            userObj.id = userObj._id.toString();
            delete userObj._id;
        }

        // Handle avatarFile virtual field
        if (userObj.avatarFile) {
            // If avatarFile is populated, include it in the response
            // It will have its own url virtual from the File schema
            // You can also add avatar as a convenience field
            if (userObj.avatarFile.url) {
                userObj.avatar = userObj.avatarFile.url;
            } else if (userObj.avatarFile.path) {
                userObj.avatar = `/uploads/${userObj.avatarFile.path}`;
            }
        } else if (userObj.avatar) {
            // If no avatarFile but has avatar string, ensure it's a full URL
            if (!userObj.avatar.startsWith('http') && !userObj.avatar.startsWith('/')) {
                userObj.avatar = `/uploads/${userObj.avatar}`;
            }
        } else {
            userObj.avatar = null;
        }

        userObj.avatar_url = sanitizeUserUtils.resolveAvatarUrl(userObj.avatar);

        // Convert dates from objects to ISO strings
        if (userObj.createdAt && typeof userObj.createdAt === 'object') {
            userObj.createdAt = new Date(userObj.createdAt).toISOString();
        }
        if (userObj.updatedAt && typeof userObj.updatedAt === 'object') {
            userObj.updatedAt = new Date(userObj.updatedAt).toISOString();
        }
        if (userObj.deletedAt && typeof userObj.deletedAt === 'object') {
            userObj.deletedAt = new Date(userObj.deletedAt).toISOString();
        }

        // Remove sensitive fields
        delete userObj.password;
        delete userObj.refreshToken;
        delete userObj.__v;

        return userObj;
    }
}