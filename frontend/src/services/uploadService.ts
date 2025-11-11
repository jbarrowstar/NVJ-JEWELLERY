const API_BASE = import.meta.env.VITE_API_BASE_URL;

export interface UploadResponse {
  success: boolean;
  imageUrl: string;
  key?: string;
}

export interface MultiUploadResponse {
  success: boolean;
  images: Array<{ imageUrl: string; key: string }>;
  count: number;
}

export const uploadImage = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_BASE}/products/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Failed to upload image');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid upload response');
  }

  return res.json();
};

export const uploadMultipleImages = async (files: File[]): Promise<MultiUploadResponse> => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });

  const res = await fetch(`${API_BASE}/products/upload-multiple`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Failed to upload images');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid upload response');
  }

  return res.json();
};