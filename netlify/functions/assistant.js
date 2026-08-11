const { GoogleGenAI, Type, ThinkingLevel } = require("@google/genai");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { message, history, context } = body;

    if (!message || typeof message !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No se proporcionó un mensaje para el asistente." }),
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "La clave GEMINI_API_KEY no está configurada en las variables de entorno de Netlify.",
        }),
      };
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `
Eres el ASISTENTE FINANCIERO inteligente integrado exclusivamente en la aplicación "Mi Billetera".
Tu objetivo es ayudar al usuario con su gestión financiera basándote ÚNICAMENTE en sus DATOS REALES.

REGLAS STRICTAS Y OBLIGATORIAS:
1. NUNCA inventes saldos, cuentas, movimientos, categorías, fechas o montos.
2. Si el usuario realiza preguntas fuera del ámbito de Mi Billetera (ej: cultura general, deportes, historia, geografía):
   - Asigna "action": "OUT_OF_SCOPE".
   - "pendingTransaction": null
   - Responde exactamente: "Estoy diseñado para ayudarte con Mi Billetera y con la información financiera registrada en ella. No puedo ayudarte con esa consulta."
3. NOMBRES DE CUENTAS: Usa los nombres reales de las cuentas/métodos de pago provistos en el contexto (ej: "BBVA Débito", "Tarjeta Nu", "Efectivo", "Tarjeta Débito", "Tarjeta Crédito", "Transferencia"). NUNCA digas "tu cuenta bancaria" si hay un nombre real.

4. CONSULTAS DE SALDO, HISTORIAL Y PRESUPUESTOS (IMPORTANTE - SIN REGISTRO EN BASE DE DATOS):
   - Cuando el usuario solicite consultar su saldo (ej: "¿Cuánto dinero tengo?", "Ver saldo"), consultar gastos pasados (ej: "¿Cuánto gasté ayer?", "¿En qué gasté este mes?"), o consultar si le alcanza el presupuesto para algo:
     * "action": "NONE"
     * "pendingTransaction": null
     * "reply": Responde directamente con la información solicitada en un tono claro y conciso.
     * NUNCA generes un registro de movimiento ni pidas confirmación de guardado para preguntas o consultas de información.

5. REGISTRO DE NUEVO GASTO O INGRESO (SOLO CUANDO EL USUARIO QUIERE REGISTRAR O REPORTE UN NUEVO MOVIMIENTO):
   - Para registrar un nuevo gasto o ingreso (ej: "Gasté $250 en gasolina hoy", "Anota un ingreso de $3000 por nómina"):
   - Los 3 DATOS MANDATORIOS OBLIGATORIOS son:
     1) MONTO (monto > 0)
     2) CONCEPTO/DESCRIPCIÓN
     3) FECHA (formato YYYY-MM-DD)
   - Si FALTA CUALQUIERA de estos 3 datos obligatorios:
     - "action": "ASK_MISSING"
     - "pendingTransaction": null
     - "reply": Pregunta específicamente y de forma amable únicamente por el dato faltante.
   - Si los 3 datos obligatorios ESTÁN PRESENTES y el usuario solicitó registrar un movimiento:
     - "action": "PREVIEW_CONFIRM"
     - Evalúa si el gasto causaría saldo negativo en el total o en la cuenta especificada, o si excede el presupuesto disponible de la categoría.
     - Si causaría o empeoraría un saldo negativo o excedería el presupuesto:
       - "isRiskyPurchase": true
       - Explicar las cifras reales en "reply" advirtiendo el problema y preguntar: "¿Aun así deseas registrarla?"
     - De lo contrario:
       - "isRiskyPurchase": false
       - En "reply" presenta un resumen claro de los datos del movimiento y pregunta: "¿Deseas guardarlo?"

6. FORMATO DE RESPUESTA:
   Debes responder ÚNICAMENTE en JSON válido con el esquema especificado.
`;

    const contextText = `
CONTEXTO REAL DEL USUARIO (Fecha actual del sistema: ${context?.currentDate || new Date().toISOString().substring(0, 10)}):
- Saldo Total Disponible: $${context?.totalBalance ?? 0} MXN
- Cuentas / Métodos de Pago disponibles: ${JSON.stringify(context?.accountBalances || [])}
- Estadísticas del Mes Actual: ${JSON.stringify(context?.monthlyStats || {})}
- Presupuestos por Categoría: ${JSON.stringify(context?.budgets || [])}
- Categorías válidas: ${JSON.stringify(context?.categories || [])}
- Historial de Movimientos Recientes: ${JSON.stringify(context?.recentTransactions || [])}

HISTORIAL DE CONVERSACIÓN RECIENTE (Transitorio):
${JSON.stringify(history || [])}

MENSAJE DEL USUARIO: "${message}"
`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        reply: {
          type: Type.STRING,
          description: "Mensaje textual claro, cortés y conciso para el usuario en español.",
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
        contents: {
          parts: [
            { text: systemInstruction },
            { text: contextText },
          ],
        },
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel ? ThinkingLevel.MINIMAL : undefined,
          },
          responseMimeType: "application/json",
          responseSchema,
        },
      });
      responseText = response.text || "";
    } catch (err36) {
      console.warn("Fallo con gemini-3.6-flash en asistente, usando fallback gemini-2.5-flash:", err36);
      const fallbackRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { text: systemInstruction },
            { text: contextText },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema,
        },
      });
      responseText = fallbackRes.text || "";
    }

    if (!responseText) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No se obtuvo respuesta del modelo AI del asistente." }),
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
      body: JSON.stringify({ success: true, data: parsedData }),
    };
  } catch (error) {
    console.error("Error en Netlify Function assistant:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Ocurrió un error al procesar tu solicitud con el Asistente.",
        details: error?.message || String(error),
      }),
    };
  }
};
