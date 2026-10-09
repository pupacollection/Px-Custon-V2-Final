// PX CUSTOM — Backend Media Store & Storage Architecture
import { MediaItem } from '../../src/types';

export interface StoredMedia extends MediaItem {
  resourceType: 'event' | 'vehicle' | 'profile' | 'branding' | string;
  resourceId?: string;
  userId?: string;
  bucket?: 'events' | 'vehicles' | 'profiles' | 'branding';
  storagePath?: string;
  publicUrl?: string;
  isDeleted?: boolean;
}

class MediaStore {
  private mediaItems: Map<string, StoredMedia> = new Map();

  // Save new media item
  saveMedia(item: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    resourceType: 'event' | 'vehicle' | 'profile' | 'branding' | string;
    resourceId?: string;
    userId?: string;
    bucket?: 'events' | 'vehicles' | 'profiles' | 'branding';
    publicUrl?: string;
    isPrimary?: boolean;
    sortOrder?: number;
    storagePath?: string;
    isRealStorage?: boolean;
  }): StoredMedia {
    const id = `med-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const bucket = item.bucket || (item.resourceType === 'event' ? 'events' : item.resourceType === 'vehicle' ? 'vehicles' : item.resourceType === 'branding' ? 'branding' : 'profiles');
    
    const stored: StoredMedia = {
      id,
      url: item.url,
      publicUrl: item.publicUrl || item.url,
      fileName: item.fileName,
      fileSize: item.fileSize,
      mimeType: item.mimeType,
      bucket,
      resourceType: item.resourceType,
      resourceId: item.resourceId,
      userId: item.userId,
      isPrimary: item.isPrimary ?? false,
      sortOrder: item.sortOrder ?? 0,
      storagePath: item.storagePath || `${bucket}/${item.resourceId || 'common'}/${item.fileName}`,
      isLocalPreview: !item.isRealStorage,
      uploadedAt: new Date().toISOString(),
    };

    this.mediaItems.set(id, stored);
    return stored;
  }

  // Get media by ID
  getMedia(id: string): StoredMedia | undefined {
    const item = this.mediaItems.get(id);
    return item && !item.isDeleted ? item : undefined;
  }

  // List media for a specific resource
  listMediaByResource(resourceType: string, resourceId: string): StoredMedia[] {
    return Array.from(this.mediaItems.values())
      .filter((m) => !m.isDeleted && m.resourceType === resourceType && m.resourceId === resourceId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  // Delete media
  deleteMedia(id: string): boolean {
    const item = this.mediaItems.get(id);
    if (!item) return false;
    item.isDeleted = true;
    return true;
  }

  // Set primary media for a resource
  setPrimary(id: string): StoredMedia | null {
    const item = this.mediaItems.get(id);
    if (!item || item.isDeleted) return null;

    // Reset others of same resource
    if (item.resourceId && item.resourceType) {
      for (const m of this.mediaItems.values()) {
        if (m.resourceType === item.resourceType && m.resourceId === item.resourceId) {
          m.isPrimary = false;
        }
      }
    }

    item.isPrimary = true;
    return item;
  }

  // Reorder items
  reorder(ids: string[]): boolean {
    ids.forEach((id, index) => {
      const item = this.mediaItems.get(id);
      if (item && !item.isDeleted) {
        item.sortOrder = index;
      }
    });
    return true;
  }
}

export const mediaStore = new MediaStore();
