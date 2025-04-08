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
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const OpenAI = require("openai");
const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");
const nodemailer = require('nodemailer');
const archiver = require('archiver');




const app = express();
const port = process.env.PORT || 5500;
let currentuser;


app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'templates')));
app.use('/uploads', express.static(path.join(__dirname, 'output/images')));


const getApiKey = (llm) => {
    const keys = {
        openai: process.env.OPENAI_API_KEY,
        gemini: process.env.GOOGLE_GEMINI_API_KEY,
        deepseek: process.env.DEEPSEEK,
    };
    return keys[llm] || null;
};

const getApiEndpoint = (llm) => {
    return {
        openai: "https://models.inference.ai.azure.com",
        gemini: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        deepseek: "https://models.inference.ai.azure.com",
    }[llm];
};

const getRequestBody = (llm, prompt) => {
    return {
        openai: {
            messages: [
                { role: "system", content: "" },
                { role: "user", content: prompt }
            ],
            model: "gpt-4o-mini",
            temperature: 1,
            max_tokens: 4096,
            top_p: 1
        },
        gemini: { contents: [{ parts: [{ text: prompt }] }] },
        deepseek: {
            messages: [
                { role: "system", content: "" },
                { role: "user", content: prompt }
            ],
            model: "DeepSeek-V3",
            temperature: 0.8,
            max_tokens: 2048,
            top_p: 0.1
        },
    }[llm];
};
data = ""
app.post("/generate", async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'output', 'routes.txt');
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading the file:', err);
            }
            console.log('File content:', data);
        });
        let { llm, prompt, pagename, filename, pages, theme } = req.body;
        console.log(llm, prompt, pagename, filename, pages, theme);
        prompt = `${pages} these are the total pages needed with theme ${theme} navbar with pagenames,homepage as index.html give other outputs ${pagename}.html ${pagename}.css ${pagename}.js for ONLY ${pagename} page and routes.txt for routing names, images.txt for image filenames in images folder  ""all these as a JSON RESPONSE with KEY as FILENAME and VALUE as CONTENT"". GENERATE  flask if absolutely necessary. Use routes assuming that all HTML pages are located in the same folder. DON'T GIVE ANY EXTRA OUTPUT THAN SPECIFIED. USE ${data} for routing. INCLUDE LINKING of ${filename} assuming it is in the folder. TOPIC: ${prompt} use images from stable diffution`;
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
            fs.writeFileSync('output.txt', generatedCode);
            const pythonProcess = spawn('python', ['resp-to-code.py', JSON.stringify({ generatedCode })]);
            pythonProcess.on('close', (code) => {
                console.log(`Python process exited with code ${code}`);
            });
            const pythonProcess2 = spawn('python', ['image.py']);
            // Capture standard output
            pythonProcess2.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            // Capture standard error
            pythonProcess2.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });

            // Handle close event
            pythonProcess2.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Python script finished successfully.');
                } else {
                    console.error(`❌ Python process exited with code ${code}`);
                }
            });

            res.json({
                generatedCode: generatedCode
            });

        } else if (llm === "openai") {
            const token = process.env["OPENAI_API_KEY"];
            console.log("ok");
            const client = new OpenAI({
                baseURL: apiEndpoint,
                apiKey: token
            });

            const response = await client.chat.completions.create(requestBody);

            console.log(response.choices[0].message);

            const generatedCode = response.choices[0].message.content;
            fs.writeFileSync('output.txt', generatedCode);
            const pythonProcess = spawn('python', ['resp-to-code.py', JSON.stringify({ generatedCode })]);
            pythonProcess.on('close', (code) => {
                console.log(`Python process exited with code ${code}`);
            });
            const pythonProcess2 = spawn('python', ['image.py']);
            // Capture standard output
            pythonProcess2.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            // Capture standard error
            pythonProcess2.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });

            // Handle close event
            pythonProcess2.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Python script finished successfully.');
                } else {
                    console.error(`❌ Python process exited with code ${code}`);
                }
            });
            res.json({ generatedCode: generatedCode });

        } else if (llm === "deepseek") {
            const token = process.env.DEEPSEEK;
            console.log("Calling DeepSeek API");

            const endpoint = getApiEndpoint(llm);
            const apiKey = getApiKey(llm);

            try {
                const client = ModelClient(
                    endpoint,
                    new AzureKeyCredential(token)
                );

                console.log("Request body:", JSON.stringify(requestBody, null, 2));

                const response = await client.path("/chat/completions").post({
                    body: requestBody
                });

                if (isUnexpected(response)) {
                    console.error("DeepSeek API error:", response.body);
                    throw new Error(JSON.stringify(response.body.error || response.body));
                }

                console.log("DeepSeek response:", JSON.stringify(response.body, null, 2));

                const generatedCode = response.body.choices[0].message.content;
                fs.writeFileSync('output.txt', generatedCode);

                const pythonProcess = spawn('python', ['resp-to-code.py', JSON.stringify({ generatedCode })]);
                pythonProcess.on('close', (code) => {
                    console.log(`Python process exited with code ${code}`);
                });
                const pythonProcess2 = spawn('python', ['image.py']);
                // Capture standard output
                pythonProcess2.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                });

                // Capture standard error
                pythonProcess2.stderr.on('data', (data) => {
                    console.error(`stderr: ${data}`);
                });

                // Handle close event
                pythonProcess2.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ Python script finished successfully.');
                    } else {
                        console.error(`❌ Python process exited with code ${code}`);
                    }
                });

                res.json({ generatedCode: generatedCode });
            } catch (error) {
                console.error("DeepSeek API error:", error);
                return res.status(500).json({
                    error: "Error generating content with DeepSeek",
                    details: error.message
                });
            }
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

app.post('/api/save-project', (req, res) => {
    const { proj_name, user_id, pages } = req.body;
    console.log('Received save-project request:', { proj_name, user_id, pages });

    if (!proj_name || !user_id) {
        console.log('Missing required fields:', { proj_name, user_id });
        return res.status(400).json({ error: 'Project name and user ID are required' });
    }

    db.query(
        'INSERT INTO projects (user_id, proj_name) VALUES (?, ?)',
        [user_id, proj_name],
        (err, projectResult) => {
            if (err) {
                console.error('Error saving project to database:', err.stack);
                return res.status(500).json({ error: 'Error saving project', details: err.message });
            }

            const proj_id = projectResult.insertId;
            console.log('Project saved with ID:', proj_id);

            if (pages && pages.length > 0) {
                const pagePromises = pages.map((page, index) =>
                    new Promise((resolve, reject) => {
                        db.query(
                            'INSERT INTO pages (proj_id, pages_name, pages_description, pages_order_index) VALUES (?, ?, ?, ?)',
                            [proj_id, page.title, page.content, index],
                            (err, pageResult) => {
                                if (err) {
                                    console.error('Error saving page:', err.stack);
                                    reject(err);
                                } else {
                                    console.log(`Saved page ${page.title} for project ${proj_id}`);
                                    resolve(pageResult);
                                }
                            }
                        );
                    })
                );

                Promise.all(pagePromises)
                    .then(() => {
                        console.log(`Processed ${pages.length} pages for project ${proj_id}`);
                        res.json({ message: 'Project and pages saved successfully', proj_id: proj_id });
                    })
                    .catch(err => {
                        console.error('Error processing pages:', err);
                        res.status(500).json({ error: 'Error saving pages', details: err.message });
                    });
            } else {
                console.log('No pages provided to save');
                res.json({ message: 'Project saved successfully (no pages)', proj_id: proj_id });
            }
        }
    );
});

app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    try {
        db.query('SELECT * FROM users WHERE user_email = ?', [email], async (err, results) => {
            if (err) {
                console.error('❌ Error checking email:', err.message);
                return res.status(500).json({ success: false, message: 'Server error' });
            }

            if (results.length > 0) {
                return res.status(400).json({ success: false, message: 'Email already registered' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            db.query('INSERT INTO users (user_name, user_email, user_password) VALUES (?, ?, ?)', [username, email, hashedPassword], (err) => {
                if (err) {
                    console.error('❌ Error inserting user:', err.message);
                    return res.status(500).json({ success: false, message: 'Error creating user' });
                }

                res.status(201).json({ success: true, message: 'User registered successfully' });
            });
        });
    } catch (error) {
        console.error('❌ Signup error:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    db.query("SELECT * FROM users WHERE user_email = ?", [email], async (err, results) => {
        if (err) {
            console.error("❌ Error fetching user:", err.message);
            return res.status(500).json({ success: false, message: "Server error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Email not registered" });
        }

        const user = results[0];
        currentuser = user.user_id;
        module.exports = { currentuser };

        try {
            const isMatch = await bcrypt.compare(password, user.user_password);

            if (!isMatch) {
                return res.status(401).json({ success: false, message: "Incorrect password" });
            }

            const token = jwt.sign(
                { user_id: user.user_id },
                process.env.JWT_SECRET || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImthaXRvIiwiZW1haWwiOiJrYWl0b0BleGFtcGxlLmNvbSIsImlhdCI6MTcxMDk5NzQyMywiZXhwIjoxNzEwOTk3ODIzfQ.GKpJ-KD4qNViLfdFbUeVw7xMOeFvIYwBGqNoVa_XvD0",
                { expiresIn: "1h" }
            );

            res.status(200).json({
                success: true,
                message: "Login successful",
                token,
                user: {
                    id: user.user_id,
                    username: user.user_name,
                    email: user.user_email,
                },
            });
        } catch (error) {
            console.error("❌ Login error:", error.message);
            res.status(500).json({ success: false, message: "Server error during authentication" });
        }
    });
});

app.get('/download-zip', (req, res) => {
    const folderToZip = path.join(__dirname, 'output');
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Disposition', 'attachment; filename=output.zip');
    res.setHeader('Content-Type', 'application/zip');

    archive.on('error', err => {
        throw err;
    });

    archive.pipe(res); // Pipe directly to response
    archive.directory(folderToZip, false);
    archive.finalize();
});
const outputPath = path.join(__dirname, 'output');
const outputImagesPath = path.join(outputPath, 'images');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log("Saving to:", outputImagesPath); // ← ADD THIS
        cb(null, outputImagesPath);
    },
    filename: (req, file, cb) => {
        console.log("File name:", file.originalname); // ← ADD THIS
        cb(null, file.originalname);
    }
});


const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), (req, res) => {
    console.log("FILE UPLOADED")
  });


app.post('/api/check-email', async (req, res) => {
    const { user_email } = req.body;

    try {
        db.query('SELECT user_id FROM users WHERE user_email = ?', [user_email], (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Server error' });
            }

            if (results.length > 0) {
                res.status(200).json({ message: 'Email verified' });
            } else {
                res.status(404).json({ message: 'Email not registered' });
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
app.get('/forgot.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'forgot.html'));
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'noreplywebgen@gmail.com',
        pass: 'xrdt xbsn ovhx kmam'
    }
});

app.post('/api/generate-code', async (req, res) => {
    const { user_email } = req.body;

    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        db.query(
            'INSERT INTO verification_codes (user_email, verification_code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
            [user_email, code],
            async (err) => {
                if (err) {
                    console.error('Error storing verification code:', err);
                    return res.status(500).json({ message: 'Server error' });
                }

                const mailOptions = {
                    from: 'noreplywebgen@gmail.com',
                    to: user_email,
                    subject: 'Password Reset Verification Code',
                    html: `
                        <h2>Password Reset Request</h2>
                        <p>You have requested to reset your password. Use the following verification code:</p>
                        <h1 style="color: #6a11cb; font-size: 32px; letter-spacing: 5px;">${code}</h1>
                        <p>This code will expire in 10 minutes.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                    `
                };
                try {
                    await transporter.sendMail(mailOptions);
                    res.status(200).json({
                        message: 'Verification code sent to your email'
                    });
                } catch (emailError) {
                    console.error('Error sending email:', emailError);
                    res.status(500).json({
                        message: 'Failed to send verification code'
                    });
                }
            }
        );
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/verify-code', async (req, res) => {
    const { user_email, code } = req.body;

    try {
        db.query(
            'SELECT * FROM verification_codes WHERE user_email = ? AND verification_code = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [user_email, code],
            (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ message: 'Server error' });
                }

                if (results.length > 0) {
                    res.status(200).json({ message: 'Code verified' });
                } else {
                    res.status(400).json({ message: 'Invalid or expired code' });
                }
            }
        );
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { user_email, code, new_password } = req.body;

    if (!user_email || !code || !new_password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        db.query(
            'SELECT * FROM verification_codes WHERE user_email = ? AND verification_code = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [user_email, code],
            async (err, results) => {
                if (err) {
                    return res.status(500).json({ message: 'Server error' });
                }

                if (results.length === 0) {
                    return res.status(400).json({ message: 'Invalid or expired code' });
                }

                const hashedPassword = await bcrypt.hash(new_password, 10);

                db.query(
                    'UPDATE users SET user_password = ? WHERE user_email = ?',
                    [hashedPassword, user_email],
                    (updateErr) => {
                        if (updateErr) {
                            return res.status(500).json({ message: 'Server error' });
                        }

                        db.query(
                            'UPDATE verification_codes SET is_used = TRUE WHERE code_id = ?',
                            [results[0].code_id]
                        );

                        res.status(200).json({ message: 'Password reset successful' });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImthaXRvIiwiZW1haWwiOiJrYWl0b0BleGFtcGxlLmNvbSIsImlhdCI6MTcxMDk5NzQyMywiZXhwIjoxNzEwOTk3ODIzfQ.GKpJ-KD4qNViLfdFbUeVw7xMOeFvIYwBGqNoVa_XvD0");
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

app.get('/api/user-profile', verifyToken, (req, res) => {
    const userId = req.user.user_id;

    db.query('SELECT user_name, user_email FROM users WHERE user_id = ?', [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            username: results[0].user_name,
            email: results[0].user_email
        });
    });
});

app.post('/api/update-profile', verifyToken, async (req, res) => {
    const userId = req.user.user_id;
    const { username, email } = req.body;

    if (!username || !email) {
        return res.status(400).json({ message: 'Username and email are required' });
    }

    db.query(
        'UPDATE users SET user_name = ?, user_email = ? WHERE user_id = ?',
        [username, email, userId],
        (err) => {
            if (err) {
                return res.status(500).json({ message: 'Server error' });
            }

            res.status(200).json({ message: 'Profile updated successfully' });
        }
    );
});

app.delete('/api/delete-account', verifyToken, (req, res) => {
    const userId = req.user.user_id;

    db.query('DELETE FROM users WHERE user_id = ?', [userId], (err) => {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }

        res.status(200).json({ message: 'Account deleted successfully' });
    });
});

app.post('/api/update-password', verifyToken, async (req, res) => {
    const userId = req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
    }

    try {
        db.query('SELECT user_password FROM users WHERE user_id = ?', [userId], async (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Server error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            const isMatch = await bcrypt.compare(currentPassword, results[0].user_password);

            if (!isMatch) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            db.query(
                'UPDATE users SET user_password = ? WHERE user_id = ?',
                [hashedPassword, userId],
                (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Server error' });
                    }

                    res.status(200).json({ message: 'Password updated successfully' });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/user-projects', (req, res) => {
    console.log('User projects API called');
    const token = req.headers.authorization?.split(' ')[1];

    console.log('Authorization header:', req.headers.authorization);
    console.log('Token:', token ? 'Token exists' : 'No token provided');

    if (!token) {
        console.log('No token provided, returning 401');
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        console.log('Verifying token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImthaXRvIiwiZW1haWwiOiJrYWl0b0BleGFtcGxlLmNvbSIsImlhdCI6MTcxMDk5NzQyMywiZXhwIjoxNzEwOTk3ODIzfQ.GKpJ-KD4qNViLfdFbUeVw7xMOeFvIYwBGqNoVa_XvD0");
        const userId = decoded.user_id;
        console.log('Token verified, user ID:', userId);

        db.query(
            'SELECT proj_id, proj_name, DATE_FORMAT(proj_created_at, "%Y-%m-%d %H:%i:%s") as created_at FROM projects WHERE user_id = ? ORDER BY proj_created_at DESC',
            [userId],
            (err, results) => {
                if (err) {
                    console.error('Error fetching user projects:', err);
                    return res.status(500).json({ error: 'Error fetching projects', details: err.message });
                }

                console.log(`Found ${results.length} projects for user ${userId}`);
                res.json({ projects: results });
            }
        );
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
});

app.get('/api/project/:id', (req, res) => {
    const projectId = req.params.id;
    console.log('Fetching project with ID:', projectId);

    if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
    }

    db.query(
        'SELECT * FROM projects WHERE proj_id = ?',
        [projectId],
        (err, projectResults) => {
            if (err) {
                console.error('Error fetching project:', err);
                return res.status(500).json({ error: 'Error fetching project', details: err.message });
            }

            if (projectResults.length === 0) {
                console.log('Project not found with ID:', projectId);
                return res.status(404).json({ error: 'Project not found' });
            }

            const project = projectResults[0];
            console.log('Project found:', project);

            db.query(
                'SELECT * FROM pages WHERE proj_id = ? ORDER BY pages_order_index',
                [projectId],
                (err, pageResults) => {
                    if (err) {
                        console.error('Error fetching project pages:', err);
                        return res.status(500).json({ error: 'Error fetching project pages', details: err.message });
                    }

                    console.log(`Found ${pageResults.length} pages for project ${projectId}`);
                    console.log('Pages:', pageResults);

                    res.json({
                        project: project,
                        pages: pageResults
                    });
                }
            );
        }
    );
});
app.get('/api/check-schema', (req, res) => {
    console.log('Checking database schema...');

    db.query('DESCRIBE projects', (err, results) => {
        if (err) {
            console.error('Error checking projects table:', err);
            return res.status(500).json({ error: 'Error checking projects table', details: err.message });
        }

        console.log('Projects table schema:', results);

        db.query('SELECT COUNT(*) as count FROM projects', (err, countResults) => {
            if (err) {
                console.error('Error counting projects:', err);
                return res.status(500).json({ error: 'Error counting projects', details: err.message });
            }

            console.log('Total projects count:', countResults[0].count);

            if (countResults[0].count > 0) {
                db.query('SELECT * FROM projects LIMIT 1', (err, sampleResults) => {
                    if (err) {
                        console.error('Error getting sample project:', err);
                        return res.status(500).json({ error: 'Error getting sample project', details: err.message });
                    }

                    console.log('Sample project:', sampleResults[0]);

                    res.json({
                        schema: results,
                        totalProjects: countResults[0].count,
                        sampleProject: sampleResults[0]
                    });
                });
            } else {
                res.json({
                    schema: results,
                    totalProjects: 0,
                    sampleProject: null
                });
            }
        });
    });
});

app.post('/api/update-project', (req, res) => {
    const { proj_id, proj_name, user_id, pages } = req.body;
    console.log('Received update-project request:', { proj_id, proj_name, user_id, pages });

    if (!proj_id || !proj_name || !user_id) {
        console.log('Missing required fields:', { proj_id, proj_name, user_id });
        return res.status(400).json({ error: 'Project ID, name, and user ID are required' });
    }
    db.query(
        'UPDATE projects SET proj_name = ? WHERE proj_id = ? AND user_id = ?',
        [proj_name, proj_id, user_id],
        (err, projectResult) => {
            if (err) {
                console.error('Error updating project in database:', err.stack);
                return res.status(500).json({ error: 'Error updating project', details: err.message });
            }

            if (projectResult.affectedRows === 0) {
                return res.status(404).json({ error: 'Project not found or unauthorized' });
            }

            console.log('Project updated with ID:', proj_id);
            db.query('DELETE FROM pages WHERE proj_id = ?', [proj_id], (err) => {
                if (err) {
                    console.error('Error deleting existing pages:', err.stack);
                    return res.status(500).json({ error: 'Error updating pages', details: err.message });
                }

                if (pages && pages.length > 0) {
                    const pagePromises = pages.map((page, index) =>
                        new Promise((resolve, reject) => {
                            db.query(
                                'INSERT INTO pages (proj_id, pages_name, pages_description, pages_order_index) VALUES (?, ?, ?, ?)',
                                [proj_id, page.title, page.content, index],
                                (err, pageResult) => {
                                    if (err) {
                                        console.error('Error saving page:', err.stack);
                                        reject(err);
                                    } else {
                                        console.log(`Saved page ${page.title} for project ${proj_id}`);
                                        resolve(pageResult);
                                    }
                                }
                            );
                        })
                    );

                    Promise.all(pagePromises)
                        .then(() => {
                            console.log(`Processed ${pages.length} pages for project ${proj_id}`);
                            res.json({ message: 'Project and pages updated successfully', proj_id: proj_id });
                        })
                        .catch(err => {
                            console.error('Error processing pages:', err);
                            res.status(500).json({ error: 'Error updating pages', details: err.message });
                        });
                } else {
                    console.log('No pages provided to update');
                    res.json({ message: 'Project updated successfully (no pages)', proj_id: proj_id });
                }
            });
        }
    );
});
app.delete('/api/project/:id', (req, res) => {
    const projectId = req.params.id;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImthaXRvIiwiZW1haWwiOiJrYWl0b0BleGFtcGxlLmNvbSIsImlhdCI6MTcxMDk5NzQyMywiZXhwIjoxNzEwOTk3ODIzfQ.GKpJ-KD4qNViLfdFbUeVw7xMOeFvIYwBGqNoVa_XvD0");
        const userId = decoded.user_id;
        db.query('SELECT * FROM projects WHERE proj_id = ? AND user_id = ?', [projectId, userId], (err, results) => {
            if (err) {
                console.error('Error checking project:', err);
                return res.status(500).json({ error: 'Error checking project', details: err.message });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Project not found or unauthorized' });
            }
            db.query('DELETE FROM projects WHERE proj_id = ?', [projectId], (err) => {
                if (err) {
                    console.error('Error deleting project:', err);
                    return res.status(500).json({ error: 'Error deleting project', details: err.message });
                }
                db.query('DELETE FROM pages WHERE proj_id = ?', [projectId], (err) => {
                    if (err) {
                        console.error('Error deleting pages:', err);
                        return res.status(500).json({ error: 'Error deleting pages', details: err.message });
                    }

                    res.json({ message: 'Project deleted successfully' });
                });
            });
        });
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
});
app.get("/download-zip", async (req, res) => {
    const folderPath = path.join(__dirname, "output");
    const zip = new JSZip();

    fs.readdir(folderPath, (err, files) => {
        if (err) {
            return res.status(500).send("Error reading folder.");
        }

        fs.readdir(folderPath, (err, files) => {
            if (err) {
                return res.status(500).send("Error reading folder.");
            }
        
            files.forEach(file => {
                const filePath = path.join(folderPath, file);
                const stat = fs.statSync(filePath);
                if (stat.isFile()) {
                    const fileData = fs.readFileSync(filePath);
                    zip.file(file, fileData);
                }
            });
        
            zip.generateAsync({ type: "nodebuffer" }).then(content => {
                res.set({
                    "Content-Type": "application/zip",
                    "Content-Disposition": "attachment; filename=output.zip"
                });
                res.send(content);
            });
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


if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

module.exports = app;