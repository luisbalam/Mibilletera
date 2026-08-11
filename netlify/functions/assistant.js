const fetch = globalThis.fetch;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { message, history, context } = body;

    if (!message || typeof message !== "string") {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No se proporcionó un mensaje para el asistente." }),
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "La clave GEMINI_API_KEY no está configurada en Netlify. Por favor agrégala en Netlify (Site settings > Environment variables).",
        }),
      };
    }

    const systemInstructionText = `
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

5. REGISTRO DE NUEVO GASTO O INGRESO (SOLO CUANDO EL USUARIO QUIERE REGISTRAR O REPORTA UN NUEVO MOVIMIENTO):
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

    const payload = {
      systemInstruction: {
        parts: [{ text: systemInstructionText }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: contextText }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            reply: {
              type: "STRING",
              description: "Mensaje textual claro, cortés y conciso para el usuario en español.",
            },
            action: {
              type: "STRING",
              description: "Acción requerida: 'NONE', 'ASK_MISSING', 'PREVIEW_CONFIRM', 'OUT_OF_SCOPE', 'PURCHASE_EVALUATION'",
            },
            pendingTransaction: {
              type: "OBJECT",
              description: "Datos del movimiento detectado si todos los campos obligatorios están presentes, o null si falta alguno.",
              properties: {
                type: { type: "STRING", description: "'gasto' o 'ingreso'" },
                amount: { type: "NUMBER", description: "Monto positivo en números" },
                concept: { type: "STRING", description: "Descripción o concepto del movimiento" },
                category: { type: "STRING", description: "Categoría de gasto o ingreso" },
                date: { type: "STRING", description: "Fecha en YYYY-MM-DD" },
                time: { type: "STRING", description: "Hora en HH:mm" },
                paymentMethod: { type: "STRING", description: "Nombre exacto de la cuenta / método de pago" },
                notes: { type: "STRING", description: "Notas adicionales opcionales" },
              },
            },
            isRiskyPurchase: {
              type: "BOOLEAN",
              description: "true si la compra provoca o empeora saldo negativo o excede presupuesto",
            },
            riskReason: {
              type: "STRING",
              description: "Razón detallada de riesgo si aplica",
            },
          },
          required: ["reply", "action"],
        },
      },
    };

    let responseText = "";
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let lastErrorDetails = "";

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`Error Netlify Assistant [${model}] status ${res.status}:`, errText);
          lastErrorDetails = `Status ${res.status}: ${errText}`;
          continue;
        }

        const data = await res.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          responseText = candidateText;
          break;
        }
      } catch (err) {
        console.warn(`Excepción Netlify Assistant [${model}]:`, err);
        lastErrorDetails = err?.message || String(err);
      }
    }

    if (!responseText) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "No se pudo obtener respuesta del modelo AI del asistente.",
          details: lastErrorDetails,
        }),
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, data: parsedData }),
    };
  } catch (error) {
    console.error("Error en Netlify Function assistant:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Ocurrió un error al procesar tu solicitud con el Asistente.",
        details: error?.message || String(error),
      }),
    };
  }
};
