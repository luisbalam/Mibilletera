import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
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

      // Robust extraction of clean Base64 string and MIME type
      let cleanBase64 = String(imageBase64);
      let detectedMimeType = mimeType || "image/jpeg";

      if (cleanBase64.includes(";base64,")) {
        const parts = cleanBase64.split(";base64,");
        const header = parts[0];
        cleanBase64 = parts[1];
        if (header.startsWith("data:")) {
          detectedMimeType = header.replace("data:", "").trim();
        }
      } else if (cleanBase64.includes(",")) {
        cleanBase64 = cleanBase64.split(",")[1];
      }
      cleanBase64 = cleanBase64.trim();

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("GEMINI_API_KEY no configurada en variables de entorno.");
        return res.status(500).json({
          error: "La clave GEMINI_API_KEY no está configurada en las variables de entorno del servidor.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
      });

      const imagePart = {
        inlineData: {
          data: cleanBase64,
          mimeType: detectedMimeType,
        },
      };

      const textPart = {
        text: `Analiza esta imagen de ticket de compra o recibo y extrae la información requerida en formato JSON.
Campos a extraer:
- concept: Nombre comercial del negocio o establecimiento (ej: OXXO, Walmart, Pemex, Restaurante, etc.).
- amount: Monto total pagado en números (ej: 185.50). Debe ser mayor a 0.
- category: Categoría sugerida (Alimentos, Gasolina, Restaurantes, Servicios, Salud, Mascotas, Supermercado, Entretenimiento, Suscripciones, Ropa, Hogar, Varios).
- date: Fecha impresa en formato YYYY-MM-DD.
- time: Hora impresa en formato HH:mm.
- paymentMethod: Forma de pago (Efectivo, Tarjeta Débito, Tarjeta Crédito, Transferencia).
- notes: Resumen o descripción de productos del ticket.`,
      };

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          concept: {
            type: Type.STRING,
            description: "Nombre comercial del negocio o establecimiento",
          },
          amount: {
            type: Type.NUMBER,
            description: "Monto total pagado en número (ej: 185.50)",
          },
          category: {
            type: Type.STRING,
            description: "Categoría más apropiada del gasto",
          },
          date: {
            type: Type.STRING,
            description: "Fecha impresa en formato YYYY-MM-DD",
          },
          time: {
            type: Type.STRING,
            description: "Hora impresa en formato HH:mm",
          },
          paymentMethod: {
            type: Type.STRING,
            description: "Forma de pago (Efectivo, Tarjeta Débito, Tarjeta Crédito, Transferencia)",
          },
          notes: {
            type: Type.STRING,
            description: "Resumen o lista breve de artículos del ticket",
          },
        },
        required: ["concept", "amount", "category", "paymentMethod"],
      };

      let responseText = "";

      // Primary attempt with gemini-3.6-flash with minimal thinking for ultra fast response
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: { parts: [imagePart, textPart] },
          config: {
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.MINIMAL,
            },
            responseMimeType: "application/json",
            responseSchema,
          },
        });
        responseText = response.text || "";
      } catch (err36) {
        console.warn("Fallo con gemini-3.6-flash, intentando fallback con gemini-2.5-flash...", err36);
        // Fallback attempt with gemini-2.5-flash
        const fallbackRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: { parts: [imagePart, textPart] },
          config: {
            responseMimeType: "application/json",
            responseSchema,
          },
        });
        responseText = fallbackRes.text || "";
      }

      if (!responseText) {
        return res.status(500).json({ error: "El modelo de Inteligencia Artificial no devolvió datos para la imagen provista." });
      }

      const cleanedJson = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsedData = JSON.parse(cleanedJson);

      return res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error("Error al escanear ticket con Gemini AI:", error);
      return res.status(500).json({
        error: error?.message || "Ocurrió un error al analizar la imagen del ticket con Inteligencia Artificial.",
        details: String(error),
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
