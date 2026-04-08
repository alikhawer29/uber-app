export class ObjectIdUtils {
    static convertObjectIdsToStrings(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (obj instanceof Date) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.convertObjectIdsToStrings(item));
        }

        if (typeof obj === 'object') {
            if (this.isBsonObjectId(obj)) {
                return obj.toString();
            }

            if (typeof obj.toJSON === 'function') {
                obj = obj.toJSON();
            }

            // ObjectId.toJSON() returns a string; iterating a string with for-in produced bogus { "0":"6", ... } keys.
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map((item) => this.convertObjectIdsToStrings(item));
            }

            if (obj._id && typeof obj._id === 'object' && typeof obj._id.toString === 'function') {
                obj._id = obj._id.toString();
            }

            const result: Record<string, any> = {};
            for (const key of Object.keys(obj)) {
                result[key] = this.convertObjectIdsToStrings(obj[key]);
            }
            return result;
        }

        return obj;
    }

    private static isBsonObjectId(val: any): boolean {
        return (
            val != null &&
            typeof val === 'object' &&
            typeof val.toString === 'function' &&
            (val._bsontype === 'ObjectId' || val.constructor?.name === 'ObjectId')
        );
    }
}
