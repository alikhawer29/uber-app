export class sanitizeUserUtils {
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