import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

const uploadPath = './uploads';
if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
}

export const multerConfig = {
    storage: diskStorage({
        destination: uploadPath,
        filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            callback(null, uniqueSuffix + extname(file.originalname));
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 2 MB
};
