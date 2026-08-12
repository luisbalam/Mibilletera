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
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
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
        console.warn("Fallo con gemini-3.6-flash, intentando fallback con gemini-flash-latest...", err36);
        // Fallback attempt with gemini-flash-latest
        const fallbackRes = await ai.models.generateContent({
          model: "gemini-flash-latest",
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

  // AI Financial Assistant Endpoint
  app.post("/api/assistant", async (req, res) => {
    try {
      const { message, mediaAttachment, history, context } = req.body;

      if (!message && !mediaAttachment) {
        return res.status(400).json({ error: "No se proporcionó un mensaje o archivo para el asistente." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "La clave GEMINI_API_KEY no está configurada en las variables de entorno del servidor.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const userName = context?.userName || 'Luis';

      const systemInstruction = `
Eres el ASISTENTE FINANCIERO inteligente integrado exclusivamente en la aplicación "Mi Billetera".
Tu usuario principal se llama ${userName}.

OBJETIVO GENERAL:
Ayudar a ${userName} a registrar, consultar y gestionar sus finanzas personales basándote ÚNICAMENTE en datos reales proporcionados por él a través de texto, imágenes de tickets/recibos o notas de voz/audios.

REGLAS DE INTERACCIÓN Y USO DEL NOMBRE:
1. Dirígete SIEMPRE al usuario llamándolo por su nombre ("${userName}") de forma cordial, profesional y personalizada en tus respuestas ("reply").
2. NUNCA inventes saldos, montos, conceptos, fechas ni categorías.

REGLAS PARA PROCESAMIENTO DE IMÁGENES (Tickets, recibos, capturas de compras o notas escritas):
1. Analiza con máxima precisión la imagen adjunta.
2. Intenta extraer los 3 DATOS MANDATORIOS:
   - MONTO (número positivo > 0)
   - FECHA (formato YYYY-MM-DD; si no figura en la imagen, asume la fecha actual del sistema: ${context?.currentDate || new Date().toISOString().substring(0, 10)})
   - DESCRIPCIÓN/CONCEPTO (comercio, producto o servicio)
3. SI LA IMAGEN NO TIENE QUE VER CON GASTOS NI TRANSACCIONES FINANCIERAS (ej: foto personal, paisaje, meme, animal o documento no financiero):
   - "action": "OUT_OF_SCOPE"
   - "pendingTransaction": null
   - "reply": "Hola ${userName}, la imagen adjunta no contiene información sobre un ticket, recibo o gasto para Tu Billetera. Por favor envía un comprobante o apunte de gasto válido."
4. SI LA IMAGEN ES DE UN GASTO/TICKET PERO UN DATO NO SE VE, ESTÁ BORROSO, INCOMPLETO O DUDOSO:
   - NUNCA inventes el dato dudoso.
   - "action": "ASK_MISSING"
   - "pendingTransaction": null
   - "reply": Pregunta amablemente a ${userName} específicamente por el dato que falta o no es claro (ej: "Hola ${userName}, observo el recibo pero no se distingue claramente el monto total. ¿Podrías confirmarme cuánto pagaste?").

REGLAS PARA PROCESAMIENTO DE AUDIO (Notas de voz o archivos de audio):
1. Escucha y transcribe con total precisión el audio adjunto.
2. Intenta extraer los 3 DATOS MANDATORIOS:
   - MONTO (número positivo > 0)
   - FECHA (formato YYYY-MM-DD; si en el audio dice "hoy", usa la fecha actual ${context?.currentDate}; si dice "ayer", calcula el día anterior; si no especifica fecha, asume la fecha actual)
   - DESCRIPCIÓN/CONCEPTO (motivo o detalle del gasto o ingreso)
3. SI EL AUDIO NO TIENE QUE VER CON GASTOS NI FINANZAS (ej: un saludo aislado, ruido, música, conversación ajena):
   - "action": "OUT_OF_SCOPE"
   - "pendingTransaction": null
   - "reply": "Hola ${userName}, en el audio enviado no identifiqué ninguna mención sobre un gasto o movimiento financiero para Tu Billetera."
4. SI EN EL AUDIO FALTA O ES DUDOSO ALGÚN DATO MANDATORIO (monto no mencionado, concepto vago o indescifrable):
   - NUNCA inventes el dato.
   - "action": "ASK_MISSING"
   - "pendingTransaction": null
   - "reply": Pregunta respetuosamente a ${userName} por el dato faltante (ej: "Hola ${userName}, escuché que pagaste la cuenta del restaurante, pero no mencionaste el monto. ¿De cuánto fue el gasto?").

REGLAS PARA REGISTRO DE MOVIMIENTOS COMPLETOS:
1. Cuando los 3 datos mandatorios (Monto, Concepto y Fecha) estén claros y confirmados (vía texto, imagen o audio):
   - "action": "PREVIEW_CONFIRM"
   - Rellena "pendingTransaction" con type ('gasto' o 'ingreso'), amount, concept, category (de la lista de categorías válidas), date, time y paymentMethod.
   - Evalúa si el gasto causaría saldo negativo en el total o en la cuenta de pago, o si excede el presupuesto disponible de la categoría.
   - Si causa saldo negativo o excede presupuesto:
     - "isRiskyPurchase": true
     - "reply": Advierte a ${userName} del impacto financiero con cifras reales y pregunta: "Hola ${userName}, ... ¿Aun así deseas registrar esta compra?"
   - De lo contrario:
     - "isRiskyPurchase": false
     - "reply": "Hola ${userName}, he preparado el registro del gasto por $X.XX MXN en [Categoría]... ¿Deseas guardarlo?"

REGLAS PARA PREGUNTAS / CONSULTAS DE SALDO O HISTORIAL:
1. Si ${userName} solo consulta saldos, gastos pasados o presupuesto:
   - "action": "NONE"
   - "pendingTransaction": null
   - "reply": Responde directamente dirigiéndote a ${userName}.
`;

      const contextText = `
CONTEXTO REAL DEL USUARIO (Fecha actual del sistema: ${context?.currentDate || new Date().toISOString().substring(0, 10)}):
- Nombre del usuario: ${userName}
- Saldo Total Disponible: $${context?.totalBalance ?? 0} MXN
- Cuentas / Métodos de Pago disponibles: ${JSON.stringify(context?.accountBalances || [])}
- Estadísticas del Mes Actual: ${JSON.stringify(context?.monthlyStats || {})}
- Presupuestos por Categoría: ${JSON.stringify(context?.budgets || [])}
- Categorías válidas: ${JSON.stringify(context?.categories || [])}
- Historial de Movimientos Recientes: ${JSON.stringify(context?.recentTransactions || [])}

HISTORIAL DE CONVERSACIÓN RECIENTE (Transitorio):
${JSON.stringify(history || [])}

MENSAJE DEL USUARIO: "${message || ''}"
`;

      const contentsParts: any[] = [];

      if (mediaAttachment && mediaAttachment.base64) {
        let cleanBase64 = String(mediaAttachment.base64);
        if (cleanBase64.includes(";base64,")) {
          cleanBase64 = cleanBase64.split(";base64,")[1];
        } else if (cleanBase64.includes(",")) {
          cleanBase64 = cleanBase64.split(",")[1];
        }
        cleanBase64 = cleanBase64.trim();

        let mimeType = mediaAttachment.mimeType;
        if (!mimeType) {
          mimeType = mediaAttachment.type === "image" ? "image/jpeg" : "audio/webm";
        }
        if (mimeType.includes(";")) {
          mimeType = mimeType.split(";")[0].trim();
        }

        contentsParts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType,
          },
        });
      }

      contentsParts.push({ text: contextText });

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: "Mensaje textual claro, cortés y dirigiéndose al usuario por su nombre en español.",
          },
          action: {
            type: Type.STRING,
            description: "Acción requerida: 'NONE', 'ASK_MISSING', 'PREVIEW_CONFIRM', 'OUT_OF_SCOPE', 'PURCHASE_EVALUATION'",
          },
          pendingTransaction: {
            type: Type.OBJECT,
            nullable: true,
            description: "Datos del movimiento detectado si todos los campos obligatorios están presentes, o null si falta alguno.",
            properties: {
              type: { type: Type.STRING, description: "'gasto' o 'ingreso'" },
              amount: { type: Type.NUMBER, description: "Monto positivo en números" },
              concept: { type: Type.STRING, description: "Descripción o concepto del movimiento" },
              category: { type: Type.STRING, description: "Categoría de gasto o ingreso" },
              date: { type: Type.STRING, description: "Fecha en YYYY-MM-DD" },
              time: { type: Type.STRING, description: "Hora en HH:mm" },
              paymentMethod: { type: Type.STRING, description: "Nombre exacto de la cuenta / método de pago" },
              notes: { type: Type.STRING, description: "Notas adicionales opcionales" },
            },
          },
          isRiskyPurchase: {
            type: Type.BOOLEAN,
            nullable: true,
            description: "true si la compra provoca o empeora saldo negativo o excede presupuesto",
          },
          riskReason: {
            type: Type.STRING,
            nullable: true,
            description: "Razón detallada de riesgo si aplica",
          },
        },
        required: ["reply", "action"],
      };

      let responseText = "";
      let lastError = null;

      const modelsToTry = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.6-flash"];

      // Try with structured schema first across models
      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contentsParts,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema,
            },
          });
          if (response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Fallback para modelo ${modelName} con responseSchema:`, err?.message || err);
        }
      }

      // If schema enforcement failed, try without schema enforcement but expecting JSON
      if (!responseText) {
        for (const modelName of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: contentsParts,
              config: {
                systemInstruction: systemInstruction + "\nINSTRUCCIÓN CRÍTICA: Debes responder ÚNICAMENTE en formato JSON plano con las claves 'reply' y 'action' y 'pendingTransaction'.",
                responseMimeType: "application/json",
              },
            });
            if (response.text) {
              responseText = response.text;
              break;
            }
          } catch (err: any) {
            lastError = err;
            console.warn(`Fallback para modelo ${modelName} sin schema:`, err?.message || err);
          }
        }
      }

      if (!responseText) {
        console.error("Todos los intentos con modelos de Gemini fallaron:", lastError);
        return res.status(500).json({
          error: "No se pudo obtener respuesta del modelo AI.",
          details: lastError?.message || "Servicio no disponible temporalmente.",
        });
      }

      const cleanedJson = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsedData = JSON.parse(cleanedJson);

      // SANITIZATION:
      // If action is not PREVIEW_CONFIRM or pendingTransaction lacks valid amount/concept, set pendingTransaction to null
      if (
        parsedData.action !== "PREVIEW_CONFIRM" ||
        !parsedData.pendingTransaction ||
        !parsedData.pendingTransaction.amount ||
        Number(parsedData.pendingTransaction.amount) <= 0 ||
        !parsedData.pendingTransaction.concept
      ) {
        parsedData.pendingTransaction = null;
        if (parsedData.action === "PREVIEW_CONFIRM") {
          parsedData.action = "NONE";
        }
      }

      return res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error("Error en endpoint del Asistente AI:", error);
      return res.status(500).json({
        error: error?.message || "No se pudo procesar tu solicitud en este momento.",
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
