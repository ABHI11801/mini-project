require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { spawn } = require('child_process');
const path = require("path");
const fs = require("fs");
const JSZip = require("jszip");
const multer = require('multer');
const mysql = require("mysql2");



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
data=""
app.post("/generate", async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'output', 'routes.txt');
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading the file:', err);
            }
            console.log('File content:', data);
        });
        let { llm, prompt, pagename, filename, pages } = req.body;
        console.log(llm, prompt, pagename, filename, pages);
        prompt = `${pages} these are the total pages needed, give output ${pagename}.html ${pagename}.css ${pagename}.js for ONLY ${pagename} page and routes.txt for routing names""as a json response with key as filename and value as content"". GENERATE  flask if absolutely necessary. Use routes assuming that all HTML pages are located in the same folder. DON'T GIVE ANY EXTRA OUTPUT THAN SPECIFIED. USE ${data} for routing. Include linking of ${filename} TOPIC: ${prompt} use images from www.pixabay.com`; 
        const apiKey = getApiKey(llm);
        let apiEndpoint = getApiEndpoint(llm);
        const requestBody = getRequestBody(llm, prompt, pagename, filename);

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
            fs.writeFileSync('output.txt', generatedCode);
            const pythonProcess = spawn('python', ['resp-to-code.py', JSON.stringify({ generatedCode })]);
            pythonProcess.on('close', (code) => {
                console.log(`Python process exited with code ${code}`);});
            
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
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'website_generation_data',
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database');
});

// API endpoint to save project and page data
app.post('/api/save-project', (req, res) => {
    const { proj_name, user_id, pages } = req.body;

    // 1. Save project
    db.query(
        'INSERT INTO projects (user_id, proj_name) VALUES (?, ?)',
        [user_id, proj_name],
        (err, projectResult) => {
            if (err) {
                console.error('Error saving project: ' + err.stack);
                return res.status(500).json({ error: 'Error saving project' });
            }

            const proj_id = projectResult.insertId;

            // 2. Save pages
            if (pages && pages.length > 0) {
                pages.forEach((page, index) => {
                    db.query(
                        'INSERT INTO pages (proj_id, pages_name, pages_description, pages_order_index) VALUES (?, ?, ?, ?)',
                        [proj_id, page.title, page.content, index],
                        (err, pageResult) => {
                            if (err) {
                                console.error('Error saving page: ' + err.stack);
                                // Consider how to handle partial failures (e.g., rollback)
                                // For simplicity, we'll log and continue here
                            } else {
                                console.log(`Saved page: ${page.title}`);
                            }
                        }
                    );
                });
            }

            res.json({ message: 'Project and pages saved successfully', proj_id: proj_id });
        }
    );
});

app.get("/download-zip", async (req, res) => {
    const folderPath = path.join(__dirname, "output");
    const zip = new JSZip();

    fs.readdir(folderPath, (err, files) => {
        if (err) {
            return res.status(500).send("Error reading folder.");
        }

        files.forEach(file => {
            const filePath = path.join(folderPath, file);
            const fileData = fs.readFileSync(filePath);
            zip.file(file, fileData);
        });

        zip.generateAsync({ type: "nodebuffer" }).then(content => {
            res.set({
                "Content-Type": "application/zip",
                "Content-Disposition": "attachment; filename=output.zip"
            });
            res.send(content);
        });
    });
});
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'output/'); 
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
    res.send('File uploaded successfully to output folder.');
});

app.listen(port, () => console.log(`Server running on port ${port}`));