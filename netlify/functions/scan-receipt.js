const { GoogleGenAI, Type } = require("@google/genai");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No se proporcionó la imagen del ticket." }),
      };
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const detectedMimeType = mimeType || "image/jpeg";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Clave GEMINI_API_KEY no configurada en las variables de entorno de Netlify.",
        }),
      };
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
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No se obtuvo respuesta del modelo AI." }),
      };
    }

    const parsedData = JSON.parse(responseText.trim());
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: parsedData }),
    };
  } catch (error) {
    console.error("Error en Netlify Function scan-receipt:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Ocurrió un error al procesar el ticket en el servidor.",
        details: error?.message || String(error),
      }),
    };
  }
};
