const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve your HTML file when someone visits the website
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'recovery-coach-improved.html'));
});

// AI Recovery Plan Endpoint
app.post('/api/recovery-plan', async (req, res) => {
    const { activity, sleep, sore, area, stress, effort, score, event } = req.body;

    const prompt = `You are an elite sports recovery coach. An athlete checked in with:
    - Activity: ${activity} (Effort level: ${effort}/3)
    - Sleep last night: ${sleep} hours
    - Soreness level: ${sore}/3 (Location: ${area})
    - Stress level: ${stress}/2
    - Calculated Readiness Score: ${score}/100
    - Next Scheduled Event: ${event}

    Write a concise, highly personalized 3-step recovery plan for them today. Keep it encouraging, actionable, and under 120 words. Avoid generic intro chatter; start directly with the plan.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.AI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('OpenAI Error:', data.error);
            return res.status(500).json({ plan: "Error connecting to AI service. Please check your API key." });
        }

        const plan = data.choices?.[0]?.message?.content || "Focus on hydration, light mobility, and adequate sleep tonight.";
        res.json({ plan });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ plan: "Server error generating plan." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
