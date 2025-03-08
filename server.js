require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const getApiKey = (llm) => {
    const keys = {
        gpt: process.env.OPENAI_API_KEY,
        gemini: process.env.GOOGLE_GEMINI_API_KEY,
        codellama: process.env.META_CODE_LLAMA_API_KEY,
    };
    return keys[llm] || null;
};

const getApiEndpoint = (llm) => {
    return {
        gpt: "https://api.openai.com/v1/chat/completions",
        gemini: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        codellama: "https://api.meta.ai/v1/codellama/completions",
    }[llm];
};

const getRequestBody = (llm, prompt) => {
    return {
        gpt: { model: "gpt-4-turbo", messages: [{ role: "user", content: prompt }] },
        gemini: { contents: [{ parts: [{ text: prompt }] }] },
        codellama: { prompt, temperature: 0.7 },
    }[llm];
};

app.post("/generate", async (req, res) => {
    try {
        const { llm, prompt } = req.body;
        const apiKey = getApiKey(llm);
        let apiEndpoint = getApiEndpoint(llm);
        const requestBody = getRequestBody(llm, prompt);

        if (!apiEndpoint || !requestBody) {
            return res.status(400).json({ error: "Invalid or missing LLM selection." });
        }

        if (llm === "gemini") {
            const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
            apiEndpoint = `${apiEndpoint}?key=${geminiKey}`;
            
            const response = await axios.post(apiEndpoint, requestBody, {
                headers: {
                    "Content-Type": "application/json",
                }
            });
            
            const generatedCode = response.data.candidates[0].content.parts[0].text;
            
            res.json({ 
                generatedCode: generatedCode
            });
            
        } else {
            if (!apiKey) {
                return res.status(400).json({ error: "API key not found for selected LLM." });
            }
            
            const response = await axios.post(apiEndpoint, requestBody, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                }
            });
            
            let generatedCode;
            if (llm === "gpt") {
                generatedCode = response.data.choices[0].message.content;
            } else {
                generatedCode = response.data.completion;
            }
            
            res.json({ 
                generatedCode: generatedCode
            });
        }
    } catch (error) {
        console.error("Error generating content:", error.response?.data || error.message);
        res.status(500).json({ 
            error: "Error generating content", 
            details: error.message,
            responseData: error.response?.data
        });
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));