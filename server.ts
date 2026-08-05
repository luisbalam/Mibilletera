import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser for JSON and large image base64 payloads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "Mi Billetera API" });
  });

  // AI Ticket / Receipt Scanner Endpoint
  app.post("/api/scan-receipt", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "No se proporcionó la imagen del ticket." });
      }

      // Clean base64 string if it contains data URI header
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const detectedMimeType = mimeType || "image/jpeg";

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("GEMINI_API_KEY not configured in environment variables.");
        return res.status(500).json({
          error: "Clave de API Gemini no configurada en el servidor. Revisa los ajustes de entorno.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: detectedMimeType,
              },
            },
            {
              text: `Analiza detenidamente la imagen de este ticket/comprobante de compra o recibo y extrae la información requerida de manera muy precisa.
Categorías válidas sugeridas: Alimentos, Gasolina, Restaurantes, Servicios, Salud, Mascotas, Supermercado, Entretenimiento, Suscripciones, Ropa, Hogar, Varios.
Formas de pago válidas: Efectivo, Tarjeta Débito, Tarjeta Crédito, Transferencia.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              concept: {
                type: Type.STRING,
                description: "Nombre comercial del establecimiento o descripción principal del negocio (ej: OXXO, Walmart, Pemex, Starbucks)",
              },
              amount: {
                type: Type.NUMBER,
                description: "Monto total pagado expresado en pesos (MXN). Debe ser un número decimal positivo.",
              },
              category: {
                type: Type.STRING,
                description: "Categoría más apropiada del gasto",
              },
              date: {
                type: Type.STRING,
                description: "Fecha impresa en el ticket en formato YYYY-MM-DD",
              },
              time: {
                type: Type.STRING,
                description: "Hora impresa en el ticket en formato HH:mm (24 horas)",
              },
              paymentMethod: {
                type: Type.STRING,
                description: "Forma de pago detectada (Efectivo, Tarjeta Débito, Tarjeta Crédito, Transferencia)",
              },
              notes: {
                type: Type.STRING,
                description: "Breve lista o resumen de los artículos clave comprados",
              },
            },
            required: ["concept", "amount", "category", "paymentMethod"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        return res.status(500).json({ error: "No se obtuvo respuesta del modelo AI." });
      }

      const parsedData = JSON.parse(responseText.trim());
      return res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error("Error al escanear el ticket con Gemini AI:", error);
      return res.status(500).json({
        error: "Ocurrió un error al procesar la imagen del ticket.",
        details: error?.message || String(error),
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler Middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Error en middleware del servidor:", err);
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || "Error interno del servidor.",
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor de Mi Billetera ejecutándose en http://localhost:${PORT}`);
  });
}

startServer();
