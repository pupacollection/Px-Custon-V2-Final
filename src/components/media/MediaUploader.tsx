import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Camera,
  AlertTriangle,
  X,
  Loader2,
  HardDrive,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { MediaItem } from '../../types';
import { MEDIA_CONFIG, validateMediaFile } from '../../config/media';
import {
  isSupabaseStorageConnected,
  uploadFile,
  buildOrganizedStoragePath,
  StorageBucket,
  getFileExtension,
  DetailedUploadError,
  resolveStorageUserId,
} from '../../lib/supabaseStorage';
import { ImagePreview } from './ImagePreview';
import { api } from '../../services/api';

export interface MediaUploaderProps {
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  value: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  disabled?: boolean;
  uploadType?: 'event_banner' | 'event_cover' | 'event_gallery' | 'vehicle_photos' | 'profile_avatar' | 'branding';
  resourceId?: string;
  userId?: string;
  vehicleId?: string;
  allowCamera?: boolean;
  allowReorder?: boolean;
  allowRemove?: boolean;
  allowSetPrimary?: boolean;
  label?: string;
  hint?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  multiple = false,
  accept = 'image/jpeg,image/png,image/webp',
  maxFiles = MEDIA_CONFIG.MAX_GALLERY_FILES,
  maxSize = MEDIA_CONFIG.MAX_FILE_SIZE_BYTES,
  value = [],
  onChange,
  disabled = false,
  uploadType = 'event_gallery',
  resourceId,
  userId,
  vehicleId,
  allowCamera = true,
  allowReorder = true,
  allowRemove = true,
  allowSetPrimary = true,
  label,
  hint,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadErrorDetails, setUploadErrorDetails] = useState<DetailedUploadError | null>(null);
  const [enlargedItem, setEnlargedItem] = useState<MediaItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const isConnected = isSupabaseStorageConnected();
  const isMaxReached = value.length >= maxFiles;

  const processFiles = async (files: FileList | File[]) => {
    setErrorMessage(null);
    setUploadErrorDetails(null);

    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (!multiple && fileArray.length > 1) {
      setErrorMessage('Apenas 1 imagem é permitida para este campo.');
      return;
    }

    if (multiple && value.length + fileArray.length > maxFiles) {
      setErrorMessage(`O limite máximo de ${maxFiles} imagens foi excedido.`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of fileArray) {
      const validation = validateMediaFile(file, {
        maxSizeBytes: maxSize,
        allowSvg: uploadType === 'branding',
      });

      if (!validation.valid) {
        setErrorMessage(validation.error || 'Arquivo inválido.');
        return;
      }
      validFiles.push(file);
    }

    // Start upload process
    setUploading(true);
    setUploadProgress({ current: 0, total: validFiles.length });

    const newItems: MediaItem[] = [];

    // Resolve user ID dinamicamente com prioridade para sessão Supabase Auth
    const effectiveUserId = await resolveStorageUserId(userId);

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress({ current: i + 1, total: validFiles.length });

      let targetBucket: StorageBucket = 'events';
      let fullPath = '';

      try {
        const ext = getFileExtension(file.name);
        let subType: 'event_banner' | 'event_cover' | 'event_gallery' | 'vehicle' | 'profile' | 'branding' = 'event_gallery';

        if (uploadType === 'event_banner') {
          targetBucket = 'events';
          subType = 'event_banner';
        } else if (uploadType === 'event_cover') {
          targetBucket = 'events';
          subType = 'event_cover';
        } else if (uploadType === 'event_gallery') {
          targetBucket = 'events';
          subType = 'event_gallery';
        } else if (uploadType === 'vehicle_photos') {
          targetBucket = 'vehicles';
          subType = 'vehicle';
        } else if (uploadType === 'profile_avatar') {
          targetBucket = 'profiles';
          subType = 'profile';
        } else if (uploadType === 'branding') {
          targetBucket = 'branding';
          subType = 'branding';
        }

        // Build organized unique path according to specification
        const pathData = buildOrganizedStoragePath({
          bucket: targetBucket,
          resourceType: subType,
          resourceId,
          userId: effectiveUserId,
          vehicleId,
          category: resourceId || 'general',
          extension: ext,
        });
        fullPath = pathData.fullPath;

        // Upload to Supabase Storage (lança DetailedUploadError se falhar)
        const storageResult = await uploadFile(targetBucket, fullPath, file);

        // Save metadata reference to backend/database
        const res = await api.uploadMedia({
          url: storageResult.url,
          publicUrl: storageResult.url,
          bucket: targetBucket,
          storagePath: storageResult.path,
          isRealStorage: storageResult.isRealStorage,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          resourceType: uploadType.startsWith('event')
            ? 'event'
            : uploadType.startsWith('vehicle')
            ? 'vehicle'
            : uploadType === 'branding'
            ? 'branding'
            : 'profile',
          resourceId,
          userId: effectiveUserId,
          isPrimary: !multiple || (value.length === 0 && i === 0),
          sortOrder: value.length + i,
        });

        newItems.push(res.media);
      } catch (err: any) {
        const detailed: DetailedUploadError = err && (err.statusCode !== undefined || err.bucket) ? err : {
          message: err?.message || 'Erro inesperado no upload para Supabase Storage',
          name: err?.name || 'StorageApiError',
          statusCode: err?.statusCode || (err as any)?.status || 400,
          bucket: targetBucket,
          path: fullPath || `${targetBucket}/unresolved`,
          fileName: file.name,
          fileType: file.type || 'image/jpeg',
          fileSize: file.size,
        };
        setUploadErrorDetails(detailed);
        setErrorMessage(detailed.message);
        break; // Interrompe para exibir o diagnóstico preciso do primeiro arquivo com erro
      }
    }

    setUploading(false);
    setUploadProgress(null);

    if (newItems.length > 0) {
      if (!multiple) {
        onChange(newItems.slice(0, 1));
      } else {
        onChange([...value, ...newItems]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isMaxReached) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isMaxReached) return;
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = async (id: string) => {
    await api.deleteMedia(id);
    const updated = value.filter((item) => item.id !== id);

    // If removed item was primary and others exist, set first as primary
    if (updated.length > 0 && !updated.some((item) => item.isPrimary)) {
      updated[0].isPrimary = true;
    }

    onChange(updated);
  };

  const handleSetPrimary = async (id: string) => {
    await api.setPrimaryMedia(id);
    const updated = value.map((item) => ({
      ...item,
      isPrimary: item.id === id,
    }));
    onChange(updated);
  };

  const handleMove = async (index: number, direction: 'left' | 'right') => {
    const newItems = [...value];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    // Update sort orders
    newItems.forEach((item, idx) => {
      item.sortOrder = idx;
    });

    await api.reorderMedia(newItems.map((item) => item.id));
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      {/* Header Label and Hints */}
      {(label || hint) && (
        <div className="space-y-0.5">
          {label && (
            <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider font-heading">
              {label}
            </label>
          )}
          {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled || isMaxReached}
        onChange={(e) => {
          if (e.target.files) processFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled || isMaxReached}
        onChange={(e) => {
          if (e.target.files) processFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Upload Dropzone (Desktop Drag & Drop + Touch buttons) */}
      {(!isMaxReached || !multiple) && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-[#FF1A2D] bg-[#1a080a] shadow-lg shadow-red-950/40'
              : 'border-[#262626] hover:border-[#FF1A2D]/60 bg-[#0c0c0c] hover:bg-[#111111]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#181818] text-[#FF1A2D] flex items-center justify-center border border-[#2a2a2a] group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-bold text-white font-heading">
                <span className="hidden sm:inline">Arraste arquivos aqui ou </span>
                <span className="text-[#FF1A2D]">selecione do dispositivo</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                JPG, PNG ou WEBP até 10 MB {multiple && `(máximo ${maxFiles} fotos)`}
              </p>
            </div>

            {/* Mobile Touch Quick Buttons */}
            <div
              className="flex items-center gap-2 pt-1"
              onClick={(e) => e.stopPropagation()} // Prevent double click trigger
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#2e2e2e] text-xs font-bold text-gray-200 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#FF1A2D]" />
                <span>+ Adicionar Fotos</span>
              </button>

              {allowCamera && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#2e2e2e] text-xs font-bold text-gray-200 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                  title="Tirar foto com a câmera"
                >
                  <Camera className="w-3.5 h-3.5 text-[#FF1A2D]" />
                  <span className="hidden sm:inline">Câmera</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Uploading Progress Indicator */}
      {uploading && uploadProgress && (
        <div className="p-3.5 rounded-xl bg-[#111111] border border-[#2a2a2a] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-[#FF1A2D] animate-spin" />
              <span>Enviando imagem {uploadProgress.current} de {uploadProgress.total}...</span>
            </span>
            <span className="text-gray-400 font-mono">
              {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
            </span>
          </div>

          <div className="w-full bg-[#1c1c1c] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#FF1A2D] h-1.5 transition-all duration-300"
              style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Detailed Diagnostic Error Box for Supabase Storage */}
      {uploadErrorDetails && (
        <div className="p-4 rounded-2xl bg-[#14080a] border border-[#FF1A2D]/60 space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-[#FF1A2D] shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold font-heading uppercase text-white">
                  Diagnóstico de Erro no Supabase Storage (HTTP {uploadErrorDetails.statusCode})
                </h4>
                <p className="text-[11px] text-red-300 font-mono">
                  {uploadErrorDetails.name}: {uploadErrorDetails.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setUploadErrorDetails(null);
                setErrorMessage(null);
              }}
              className="text-gray-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Diagnostic Grid Details (Prompt Item 2) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-[#0a0405] border border-red-950/60 text-[11px] font-mono">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-sans">Bucket</span>
              <span className="text-white font-bold">{uploadErrorDetails.bucket}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-sans">Status Code</span>
              <span className="text-[#FF1A2D] font-bold">{uploadErrorDetails.statusCode}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-sans">Error Name</span>
              <span className="text-gray-200">{uploadErrorDetails.name}</span>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <span className="text-gray-400 block text-[10px] uppercase font-sans">Caminho (Path)</span>
              <span className="text-gray-300 break-all">{uploadErrorDetails.path}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-sans">Arquivo</span>
              <span className="text-gray-200 truncate block">{uploadErrorDetails.fileName}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-sans">Tipo MIME</span>
              <span className="text-gray-200">{uploadErrorDetails.fileType}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-sans">Tamanho</span>
              <span className="text-gray-200">{(uploadErrorDetails.fileSize / 1024).toFixed(1)} KB</span>
            </div>
          </div>

          {/* Diagnostic Recommendation / Cause */}
          <div className="text-[11px] text-gray-300 bg-[#1c0d0f] p-2.5 rounded-xl border border-red-900/40 space-y-1">
            <span className="font-bold text-red-400 block">Causa do Erro HTTP 400:</span>
            {uploadErrorDetails.message.toLowerCase().includes('policy') ||
            uploadErrorDetails.message.toLowerCase().includes('row-level security') ||
            uploadErrorDetails.statusCode === 400 ? (
              <p className="text-gray-300 leading-relaxed">
                As políticas RLS de <code className="text-white">storage.objects</code> no Supabase exigem que o usuário esteja autenticado no Supabase Auth e com a role adequada. Verifique se o schema SQL corrigido em <code className="text-white">/supabase-schema.sql</code> foi executado no <strong>SQL Editor</strong> do Supabase.
              </p>
            ) : (
              <p className="text-gray-300 leading-relaxed">
                Verifique se o bucket <code className="text-white">{uploadErrorDetails.bucket}</code> existe e aceita o tipo MIME <code className="text-white">{uploadErrorDetails.fileType}</code> nas configurações de Storage.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-[#FF1A2D] hover:bg-red-600 text-white font-bold text-xs cursor-pointer transition"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Simple Error Message (if no detailed diagnostic) */}
      {errorMessage && !uploadErrorDetails && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-[#FF1A2D]/50 text-[#FF3344] text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-gray-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Previews Grid */}
      {value.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              {value.length} {value.length === 1 ? 'imagem anexada' : 'imagens anexadas'}
              {multiple && ` (limite: ${maxFiles})`}
            </span>
            <span className="text-[11px] text-gray-500">
              Clique nas setas para reordenar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {value.map((item, index) => (
              <ImagePreview
                key={item.id}
                item={item}
                index={index}
                total={value.length}
                allowSetPrimary={allowSetPrimary && multiple}
                allowReorder={allowReorder && multiple}
                allowRemove={allowRemove && !disabled}
                onSetPrimary={handleSetPrimary}
                onMove={handleMove}
                onRemove={handleRemove}
                onEnlarge={(it) => setEnlargedItem(it)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Storage Architecture Notice */}
      <div className="p-3 rounded-xl bg-[#090909] border border-[#1a1a1a] flex items-center gap-2.5 text-[11px] text-gray-400">
        <HardDrive className={`w-4 h-4 shrink-0 ${isConnected ? 'text-emerald-400' : 'text-[#FF1A2D]'}`} />
        <span>
          <strong>Arquitetura Supabase Storage:</strong>{' '}
          {isConnected ? (
            <span className="text-emerald-300">
              Conectado ao Supabase Storage. Arquivos enviados de forma persistente com RLS e caminhos organizados.
            </span>
          ) : (
            <span>
              Prévia local segura em memória. O sistema enviará diretamente aos buckets dedicados (<code className="text-gray-300">events</code>, <code className="text-gray-300">vehicles</code>, <code className="text-gray-300">profiles</code> ou <code className="text-gray-300">branding</code>) quando as chaves forem configuradas.
            </span>
          )}
        </span>
      </div>

      {/* Lightbox Modal */}
      {enlargedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setEnlargedItem(null)}
              className="absolute -top-10 right-0 text-gray-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={enlargedItem.url}
              alt={enlargedItem.fileName}
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-[#2a2a2a] shadow-2xl"
            />
            <div className="mt-3 text-center text-xs text-gray-300 space-x-2">
              <span className="font-bold text-white">{enlargedItem.fileName}</span>
              <span>•</span>
              <span className="font-mono">{(enlargedItem.fileSize / 1024).toFixed(0)} KB</span>
              <span>•</span>
              <span className="text-gray-400">{enlargedItem.mimeType}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
