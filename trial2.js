/*
Run this model in Javascript

> npm install @azure-rest/ai-inference @azure/core-auth @azure/core-sse
*/

const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");
require('dotenv').config();


// To authenticate with the model you will need to generate a personal access token (PAT) in your GitHub settings. 
// Create your PAT token by following instructions here: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
const token = process.env.DEEPSEEK;

async function main() {
    const client = ModelClient(
        "https://models.inference.ai.azure.com",
        new AzureKeyCredential(token)
    );

    const response = await client.path("/chat/completions").post({
        body: {
            messages: [
                { role: "system", content: "" },
                { role: "user", content: "hompage for olympics in india using html" }
            ],
            model: "DeepSeek-V3",
            temperature: 0.8,
            max_tokens: 2048,
            top_p: 0.1
        }
    });

    if (isUnexpected(response)) {
        throw response.body.error;
    }
    console.log(response.body.choices[0].message.content);
}

main().catch((err) => {
    console.error("The sample encountered an error:", err);
});
