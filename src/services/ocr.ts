import { TransactionType } from '../types';

export interface ScannedReceiptResult {
  concept: string;
  amount: number;
  category: string;
  date: string;
  time: string;
  paymentMethod: string;
  notes: string;
  type: TransactionType;
}

/**
 * Resizes and compresses an image file on the client side using HTML5 Canvas.
 * Reduces image size to max 1600px dimension and JPEG quality 0.82.
 * This prevents payload size issues (502 Bad Gateway / 413 Payload Too Large) and speeds up analysis.
 */
async function compressImage(file: File, maxDimension = 1600, quality = 0.82): Promise<{ imageBase64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      // Fallback
      resolve({
        imageBase64: '',
        mimeType: file.type || 'image/jpeg',
      });
    };

    reader.onload = (e) => {
      const rawResult = e.target?.result as string || '';
      const rawBase64 = rawResult.replace(/^data:image\/\w+;base64,/, '');

      const img = new Image();

      img.onerror = () => {
        // Fallback to uncompressed image if HTML image element fails
        resolve({
          imageBase64: rawBase64,
          mimeType: file.type || 'image/jpeg',
        });
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve({
              imageBase64: rawBase64,
              mimeType: file.type || 'image/jpeg',
            });
          }

          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const cleanBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

          resolve({
            imageBase64: cleanBase64,
            mimeType: 'image/jpeg',
          });
        } catch (e) {
          resolve({
            imageBase64: rawBase64,
            mimeType: file.type || 'image/jpeg',
          });
        }
      };

      img.src = rawResult;
    };

    reader.readAsDataURL(file);
  });
}

export async function scanReceiptImage(file: File): Promise<ScannedReceiptResult> {
  try {
    // 1. Compress & optimize image before sending over HTTP
    const { imageBase64, mimeType } = await compressImage(file);

    // 2. Call backend server API endpoint
    const response = await fetch('/api/scan-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        mimeType,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (errData.error) {
        throw new Error(errData.error);
      }
      if (response.status === 502 || response.status === 504) {
        throw new Error("El servidor de análisis está ocupado o no respondió a tiempo. Por favor intenta de nuevo.");
      }
      throw new Error(`Error del servidor (${response.status})`);
    }

    const resJson = await response.json();
    if (!resJson.success || !resJson.data) {
      throw new Error(resJson.error || "No se pudo interpretar la información del ticket.");
    }

    const data = resJson.data;

    // Ensure fallback defaults if fields are empty or invalid
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const defaultDate = `${year}-${month}-${day}`;

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const defaultTime = `${hours}:${minutes}`;

    return {
      concept: data.concept || 'Gasto Ticket OCR',
      amount: typeof data.amount === 'number' && data.amount > 0 ? data.amount : 0,
      category: data.category || 'Supermercado',
      date: data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : defaultDate,
      time: data.time && /^\d{2}:\d{2}$/.test(data.time) ? data.time : defaultTime,
      paymentMethod: data.paymentMethod || 'Tarjeta Débito',
      notes: data.notes || 'Escaneado automáticamente con Gemini IA',
      type: 'gasto',
    };
  } catch (err: any) {
    console.error("Error en scanReceiptImage:", err);
    throw err;
  }
}

