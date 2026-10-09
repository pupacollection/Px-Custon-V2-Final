// PX CUSTOM — Configurações Centralizadas de Upload de Mídia e Supabase Storage

export type StorageBucket = 'events' | 'vehicles' | 'profiles' | 'branding';

export const MEDIA_CONFIG = {
  // Limites de tamanho e quantidade
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB por arquivo padrão
  MAX_PROFILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB para fotos de perfil
  MAX_GALLERY_FILES: 20, // Máximo de 20 imagens na galeria
  MAX_VEHICLE_PHOTOS: 10, // Máximo de 10 fotos por veículo

  // Buckets Oficiais do Supabase Storage
  BUCKETS: {
    EVENTS: 'events' as StorageBucket,
    VEHICLES: 'vehicles' as StorageBucket,
    PROFILES: 'profiles' as StorageBucket,
    BRANDING: 'branding' as StorageBucket,
  },

  // Tipos MIME permitidos (inclui image/jpg para compatibilidade ampla)
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const,
  ALLOWED_BRANDING_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'] as const,

  // Extensões permitidas
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'] as const,
  ALLOWED_BRANDING_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.svg'] as const,

  // Extensões expressamente proibidas (executáveis, scripts, etc.)
  BLOCKED_EXTENSIONS: [
    '.exe', '.sh', '.bat', '.cmd', '.js', '.ts', '.html', '.htm',
    '.php', '.phtml', '.py', '.pl', '.cgi', '.jar', '.vbs', '.msi',
    '.com', '.scr', '.ps1', '.apk', '.bin', '.dll', '.so'
  ],

  // Geradores de caminho único organizado conforme especificação:
  // EVENTOS: events/{eventId}/banner/{uuid}.{ext} | cover | gallery
  // VEÍCULOS: vehicles/{userId}/{vehicleId}/{uuid}.{ext}
  // PERFIS: profiles/{userId}/{uuid}.{ext}
  // BRANDING: branding/{category}/{uuid}.{ext}
  STORAGE_PATHS: {
    EVENT_BANNER: (eventId: string, uuid: string, ext: string) => `events/${eventId}/banner/${uuid}.${cleanExtension(ext)}`,
    EVENT_COVER: (eventId: string, uuid: string, ext: string) => `events/${eventId}/cover/${uuid}.${cleanExtension(ext)}`,
    EVENT_GALLERY: (eventId: string, uuid: string, ext: string) => `events/${eventId}/gallery/${uuid}.${cleanExtension(ext)}`,
    VEHICLE: (userId: string, vehicleId: string, uuid: string, ext: string) => `vehicles/${userId}/${vehicleId}/${uuid}.${cleanExtension(ext)}`,
    PROFILE: (userId: string, uuid: string, ext: string) => `profiles/${userId}/${uuid}.${cleanExtension(ext)}`,
    BRANDING: (category: string, uuid: string, ext: string) => `branding/${category}/${uuid}.${cleanExtension(ext)}`,
  },
};

/**
 * Remove o ponto inicial da extensão para formatação limpa
 */
export function cleanExtension(ext: string): string {
  const clean = ext.startsWith('.') ? ext.slice(1) : ext;
  return clean.toLowerCase() === 'jpeg' ? 'jpg' : clean.toLowerCase();
}

/**
 * Gera um UUID v4 seguro para garantir caminhos únicos no Supabase Storage
 */
export function generateStorageUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

/**
 * Validação rigorosa de arquivo: MIME type, extensão e tamanho.
 */
export function validateMediaFile(
  file: File,
  options?: {
    allowSvg?: boolean;
    maxSizeBytes?: number;
  }
): FileValidationResult {
  const maxSizeBytes = options?.maxSizeBytes || MEDIA_CONFIG.MAX_FILE_SIZE_BYTES;
  const allowSvg = options?.allowSvg || false;

  // 1. Verificação de tamanho
  if (file.size > maxSizeBytes) {
    const sizeInMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `O arquivo "${file.name}" excede o limite máximo permitido de ${sizeInMb} MB.`,
    };
  }

  // 2. Extração e verificação de extensão
  const fileNameLower = file.name.toLowerCase();
  const lastDotIndex = fileNameLower.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return {
      valid: false,
      error: `O arquivo "${file.name}" não possui extensão válida.`,
    };
  }

  const extension = fileNameLower.substring(lastDotIndex);

  // Verificação contra extensões executáveis bloqueadas
  if (MEDIA_CONFIG.BLOCKED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Formato de arquivo não permitido por motivos de segurança (${extension}).`,
    };
  }

  // Verificação contra extensões de imagem permitidas
  const allowedExtensions = allowSvg
    ? MEDIA_CONFIG.ALLOWED_BRANDING_EXTENSIONS
    : MEDIA_CONFIG.ALLOWED_EXTENSIONS;

  if (!allowedExtensions.includes(extension as any)) {
    return {
      valid: false,
      error: `Formato de extensão não suportado (${extension}). Use JPG, PNG ou WEBP${allowSvg ? ' (ou SVG)' : ''}.`,
    };
  }

  // 3. Verificação de MIME Type
  const allowedMimes = allowSvg
    ? MEDIA_CONFIG.ALLOWED_BRANDING_TYPES
    : MEDIA_CONFIG.ALLOWED_IMAGE_TYPES;

  if (!allowedMimes.includes(file.type as any)) {
    return {
      valid: false,
      error: `Tipo de mídia inválido (${file.type}). Apenas imagens são permitidas.`,
    };
  }

  // Sanitização do nome do arquivo
  const sanitizedName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .slice(0, 100);

  return {
    valid: true,
    sanitizedName,
  };
}

/**
 * Converte um arquivo local em Data URL para preview instantâneo
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}
