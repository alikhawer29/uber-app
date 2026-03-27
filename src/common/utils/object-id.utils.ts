export class ObjectIdUtils {
    static convertObjectIdsToStrings(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (obj instanceof Date) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.convertObjectIdsToStrings(item));
        }

        if (typeof obj === 'object') {
            // If object has toJSON method (like Mongoose documents), call it first
            if (typeof obj.toJSON === 'function') {
                obj = obj.toJSON();
            }

            // Check if it's a MongoDB ObjectId
            if (obj._id && typeof obj._id === 'object' && obj._id.toString) {
                obj._id = obj._id.toString();
            }

            // Convert all properties
            const result: any = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    result[key] = this.convertObjectIdsToStrings(obj[key]);
                }
            }
            return result;
        }

        return obj;
    }
}