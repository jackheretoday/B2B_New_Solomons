import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = typeof window !== 'undefined' 
  ? `${window.location.origin}/api/supabase` 
  : (import.meta.env.VITE_SUPABASE_URL || 'https://proxymqvyzjbzeumzizj.supabase.co');
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJpc3MiOiAic3VwYWJhc2UiLCAicmVmIjogInByb3h5bXF2eXpqYnpldW16aXpqIiwgInJvbGUiOiAiYW5vbiIsICJpYXQiOiAxNzAwMDAwMDAwLCAiZXhwIjogMjAwMDAwMDAwMH0.c2ln';
export const STORAGE_BUCKET = 'issue-photos';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Mapping between frontend role user IDs and Supabase profiles UUIDs
export const USER_ID_MAP: Record<string, string> = {
  citizen1: 'f05044cd-a653-4dfb-8123-df6a97608052',
  citizen2: '8d6cd6d7-9859-4db8-a636-cf852be95488',
  admin: '9b3a3304-89c8-4c9a-86b1-56a5e25d9498',
  worker1: '7f818a47-f047-428a-92c9-8d6e3367485b',
};

export const REVERSE_USER_ID_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(USER_ID_MAP).map(([k, v]) => [v, k])
);

export function toSupabaseUserId(id: string): string {
  if (USER_ID_MAP[id]) return USER_ID_MAP[id];
  // If it's already a valid uuid, return it
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return USER_ID_MAP['citizen1'];
}

export function fromSupabaseUserId(uuid: string): string {
  return REVERSE_USER_ID_MAP[uuid] || uuid;
}

/**
 * Upload an image (base64 string or File/Blob) to Supabase Storage
 * returns public URL
 */
export async function uploadImageToStorage(
  imageData: string | Blob,
  fileNamePrefix: string = 'issue'
): Promise<string> {
  try {
    let blob: Blob;
    let extension = 'jpg';

    if (typeof imageData === 'string') {
      if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        return imageData;
      }
      
      let mimeType = 'image/jpeg';
      let rawBase64 = imageData;
      if (imageData.startsWith('data:')) {
        const parts = imageData.split(';base64,');
        mimeType = parts[0].replace('data:', '');
        rawBase64 = parts[1];
        extension = mimeType.split('/')[1] || 'jpg';
      }

      const byteCharacters = atob(rawBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: mimeType });
    } else {
      blob = imageData;
    }

    const uniqueName = `${fileNamePrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(uniqueName, blob, {
        contentType: blob.type || 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.warn('Storage upload error:', error);
      // Fallback: return data url if upload fails
      return typeof imageData === 'string' ? imageData : '';
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.error('Failed to upload image:', err);
    return typeof imageData === 'string' ? imageData : '';
  }
}
