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
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No se proporcionó la imagen del ticket." }),
      };
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const detectedMimeType = mimeType || "image/jpeg";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Clave GEMINI_API_KEY no configurada en Netlify. Por favor agrégala en Netlify (Site settings > Environment variables).",
        }),
      };
    }

    const payload = {
      contents: [
        {
          role: "user",
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
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            concept: {
              type: "STRING",
              description: "Nombre comercial del establecimiento o descripción principal del negocio (ej: OXXO, Walmart, Pemex, Starbucks)",
            },
            amount: {
              type: "NUMBER",
              description: "Monto total pagado expresado en pesos (MXN). Debe ser un número decimal positivo.",
            },
            category: {
              type: "STRING",
              description: "Categoría más apropiada del gasto",
            },
            date: {
              type: "STRING",
              description: "Fecha impresa en el ticket en formato YYYY-MM-DD",
            },
            time: {
              type: "STRING",
              description: "Hora impresa en el ticket en formato HH:mm (24 horas)",
            },
            paymentMethod: {
              type: "STRING",
              description: "Forma de pago detectada (Efectivo, Tarjeta Débito, Tarjeta Crédito, Transferencia)",
            },
            notes: {
              type: "STRING",
              description: "Breve lista o resumen de los artículos clave comprados",
            },
          },
          required: ["concept", "amount", "category", "paymentMethod"],
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
          console.warn(`Error Scan Receipt [${model}] status ${res.status}:`, errText);
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
        console.warn(`Excepción Scan Receipt [${model}]:`, err);
        lastErrorDetails = err?.message || String(err);
      }
    }

    if (!responseText) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "No se obtuvo respuesta del modelo AI para el ticket.",
          details: lastErrorDetails,
        }),
      };
    }

    const parsedData = JSON.parse(responseText.trim());
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, data: parsedData }),
    };
  } catch (error) {
    console.error("Error en Netlify Function scan-receipt:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Ocurrió un error al procesar el ticket en el servidor.",
        details: error?.message || String(error),
      }),
    };
  }
};
