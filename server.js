const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve main web app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'recovery-coach-improved.html'));
});

// Gemini AI Recovery Plan Endpoint
app.post('/api/recovery-plan', async (req, res) => {
    const { activity, sleep, sore, area, stress, effort, score, event } = req.body;

    const prompt = `You are an elite sports recovery coach. An athlete checked in with:
    - Activity Today: ${activity} (Effort level: ${effort}/3)
    - Sleep last night: ${sleep} hours
    - Soreness level: ${sore}/3 (Location: ${area})
    - Stress level: ${stress}/2
    - Calculated Readiness Score: ${score}/100
    - Next Scheduled Event: ${event}

    CRITICAL INSTRUCTION: Step 1 of your plan MUST directly reference and target the specific physical demands of "${activity}". Start directly with a 3-step recovery plan. Keep it encouraging, actionable, and under 120 words.`;

    const apiKey = process.env.AI_API_KEY;
    
    // Active Gemini 3 series models
    const modelsToTry = [
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite'
    ];

    let lastError = null;

    for (const model of modelsToTry) {
        try {
            // v1beta endpoint for Gemini 3 generation models
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            const data = await response.json();

            if (data.error) {
                console.warn(`Model ${model} returned error (${data.error.code}): ${data.error.message}`);
                lastError = data.error;
                continue; // Fall through to next model if unavailable
            }

            const plan = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (plan) {
                console.log(`Success using model: ${model}`);
                return res.json({ plan });
            }
        } catch (err) {
            console.error(`Exception trying ${model}:`, err);
            lastError = err;
        }
    }

    console.error('All Gemini API attempts failed:', lastError);
    return res.status(500).json({ plan: "Error connecting to AI service. Please check your API key." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Recovery Coach server live on port ${PORT}`);
});
