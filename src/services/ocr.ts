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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Error al leer el archivo de la imagen."));

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => reject(new Error("No se pudo procesar la imagen seleccionada."));

      img.onload = () => {
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
          return reject(new Error("No se pudo obtener el contexto gráfico para procesar el ticket."));
        }

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const cleanBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

        resolve({
          imageBase64: cleanBase64,
          mimeType: 'image/jpeg',
        });
      };

      img.src = e.target?.result as string;
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
      if (response.status === 502 || response.status === 504) {
        throw new Error("El servidor de análisis está ocupado o no respondió a tiempo. Por favor intenta de nuevo.");
      }
      throw new Error(errData.error || `Error del servidor (${response.status})`);
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

