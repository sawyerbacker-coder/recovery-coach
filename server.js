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

    try {
        const apiKey = process.env.AI_API_KEY;
        // Using active standard Gemini 2.0 Flash model
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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
            console.error('Gemini API Error:', data.error);
            return res.status(500).json({ plan: "Error connecting to AI service. Please check your API key." });
        }

        const plan = data.candidates?.[0]?.content?.parts?.[0]?.text || "Focus on hydration, light mobility, and adequate sleep tonight.";
        res.json({ plan });

    } catch (error) {
        console.error('Server Exception:', error);
        res.status(500).json({ plan: "Server error generating recovery plan." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Recovery Coach server live on port ${PORT}`);
});
