export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, systemInstruction } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || req.headers['x-gemini-api-key'];

    if (!apiKey) {
      throw new Error('No Gemini API Key found in environment variables.');
    }

    const finalPrompt = systemInstruction 
      ? `[SYSTEM CONTEXT & INSTRUCTIONS]\n${systemInstruction}\n\n[USER REQUEST]\n${prompt}`
      : prompt;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: finalPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API Error');
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('Failed to extract text from Gemini response');
    }

    return res.status(200).json({ text: generatedText });

  } catch (err) {
    console.error('Gemini API Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to communicate with AI server' });
  }
}
