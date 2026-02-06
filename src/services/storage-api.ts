import { supabase } from '../lib/supabase';

type StorageBucket = 'avatars' | 'patient-photos' | 'signatures';

export const storageApi = {
    /**
     * Upload a file to Supabase Storage
     * @param bucket The bucket name
     * @param path The file path (e.g., 'user-123.jpg')
     * @param file The file object
     */
    async uploadFile(bucket: StorageBucket, path: string, file: File): Promise<string> {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;

        // Return publicly accessible URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return publicUrl;
    },

    /**
     * Upload a Base64 string (often from camera or canvas)
     * @param bucket The bucket name
     * @param path The file path/name
     * @param base64Data The base64 string (data:image/...)
     */
    async uploadBase64(bucket: StorageBucket, path: string, base64Data: string): Promise<string> {
        // Remove header if present (data:image/png;base64,...)
        const base64Part = base64Data.split(',')[1] || base64Data;
        const buffer = Uint8Array.from(atob(base64Part), c => c.charCodeAt(0));
        const blob = new Blob([buffer], { type: 'image/png' }); // Defaulting to png, could detect

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, blob, {
                contentType: 'image/png',
                upsert: true
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return publicUrl;
    }
};
