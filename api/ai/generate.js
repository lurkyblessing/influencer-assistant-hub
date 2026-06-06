export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { prompt, systemInstruction } = req.body;
  
  // Use Vercel backend key, or fall back to client override if passed
  const apiKey = process.env.GEMINI_API_KEY || req.headers['x-gemini-api-key'] || '';

  if (!apiKey) {
    return res.status(200).json({
      text: "Lumina Hub AI Error: GEMINI_API_KEY environment variable is not configured on Vercel. Please add it to your project dashboard settings."
    });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: (systemInstruction ? `${systemInstruction}\n\n` : "") + prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "Failed to communicate with Gemini API");
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    res.status(200).json({ text });
  } catch (error) {
    console.error("Gemini server API error:", error);
    res.status(500).json({ error: error.message });
  }
}
