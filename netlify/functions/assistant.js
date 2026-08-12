import { GoogleGenAI, Type } from "@google/genai";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { message, mediaAttachment, history, context } = body;

    if (!message && !mediaAttachment) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No se proporcionó un mensaje o archivo para el asistente." }),
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "La clave GEMINI_API_KEY no está configurada en Netlify. Por favor agrégala en Netlify (Site configuration > Environment variables).",
        }),
      };
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

    const contentsParts = [];

    if (mediaAttachment && mediaAttachment.base64) {
      let cleanBase64 = mediaAttachment.base64;
      if (cleanBase64.includes(",")) {
        cleanBase64 = cleanBase64.split(",")[1];
      }

      let mimeType = mediaAttachment.mimeType;
      if (!mimeType) {
        mimeType = mediaAttachment.type === "image" ? "image/jpeg" : "audio/mp3";
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
          description: "true si la compra provoca o empeora saldo negativo o excede presupuesto",
        },
        riskReason: {
          type: Type.STRING,
          description: "Razón detallada de riesgo si aplica",
        },
      },
      required: ["reply", "action"],
    };

    let responseText = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: contentsParts,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
        },
      });
      responseText = response.text || "";
    } catch (err36) {
      console.warn("Fallo gemini-3.6-flash en Netlify, probando fallback gemini-flash-latest:", err36);
      const responseFallback = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: contentsParts,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
        },
      });
      responseText = responseFallback.text || "";
    }

    if (!responseText) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "No se obtuvo respuesta del modelo AI." }),
      };
    }

    const cleanedJson = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsedData = JSON.parse(cleanedJson);

    // SANITIZATION:
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: parsedData }),
    };
  } catch (error) {
    console.error("Error en Netlify Function assistant:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Ocurrió un error en el servidor de Netlify al procesar tu consulta.",
        details: error?.message || String(error),
      }),
    };
  }
};
