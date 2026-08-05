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

export async function scanReceiptImage(file: File): Promise<ScannedReceiptResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Error al leer la imagen seleccionada."));
    };

    reader.onload = async () => {
      try {
        const imageBase64 = reader.result as string;
        
        const response = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64,
            mimeType: file.type || 'image/jpeg',
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Error del servidor (${response.status})`);
        }

        const resJson = await response.json();
        if (!resJson.success || !resJson.data) {
          throw new Error(resJson.error || "No se pudo interpretar el ticket.");
        }

        const data = resJson.data;

        // Ensure defaults if fields are empty
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const defaultDate = `${year}-${month}-${day}`;

        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const defaultTime = `${hours}:${minutes}`;

        resolve({
          concept: data.concept || 'Gasto Ticket OCR',
          amount: typeof data.amount === 'number' && data.amount > 0 ? data.amount : 0,
          category: data.category || 'Supermercado',
          date: data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : defaultDate,
          time: data.time && /^\d{2}:\d{2}$/.test(data.time) ? data.time : defaultTime,
          paymentMethod: data.paymentMethod || 'Tarjeta Débito',
          notes: data.notes || 'Escaneado automáticamente con Gemini IA',
          type: 'gasto',
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.readAsDataURL(file);
  });
}
