require("dotenv").config();
const express = require("express");
const axios = require("axios");
const archiver = require("archiver");
const cors = require("cors");
const fs = require("fs");

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

app.post("/generate", async (req, res) => {
    try {
        const { llm, prompt } = req.body;
        const apiKey = getApiKey(llm);

        if (!apiKey) {
            return res.status(400).json({ error: "Invalid or missing LLM selection." });
        }

        const apiEndpoints = {
            gpt: "https://api.openai.com/v1/chat/completions",
            gemini: "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateText",
            codellama: "https://api.meta.ai/v1/codellama/completions",
        };

        const requestBody = {
            gpt: { model: "gpt-4-turbo", messages: [{ role: "user", content: prompt }] },
            gemini: { prompt: { text: prompt } },
            codellama: { prompt, temperature: 0.7 },
        };

        const response = await axios.post(apiEndpoints[llm], requestBody[llm], {
            headers: { Authorization: `Bearer ${apiKey}` },
        });

        const generatedCode =
            llm === "gpt"
                ? response.data.choices[0].message.content
                : response.data.text || response.data.completion;

        fs.writeFileSync("generated_project/index.html", generatedCode);

        const output = fs.createWriteStream("generated_project.zip");
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.pipe(output);
        archive.directory("generated_project/", false);
        await archive.finalize();

        res.json({ message: "Web app generated successfully!", zipFile: "generated_project.zip" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error generating the web app", details: error.message });
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
