export enum FileType {
    IMAGE = 'image',
    DOCUMENT = 'document',
    VIDEO = 'video',
    AUDIO = 'audio',
    OTHER = 'other',
}

export enum FileCategory {
    AVATAR = 'avatar',
    PROFILE = 'profile',
    DOCUMENT = 'document',
    ATTACHMENT = 'attachment',
}

export const FileMimeTypes = {
    [FileType.IMAGE]: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
    ],
    [FileType.DOCUMENT]: [
        'application/pdf',
        'application/msword',
    ],
    [FileType.VIDEO]: [
        'video/mp4',
        'video/mpeg',
    ],
    [FileType.AUDIO]: [
        'audio/mpeg',
        'audio/wav',
    ],
};