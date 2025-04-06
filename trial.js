async function main() {
    const { Client } = await import("@gradio/client");

    const client = await Client.connect("Qwen/Qwen2.5-Coder-Artifacts");
    console.log("Connected to LLM");

    const result = await client.predict("/generation_code", { 		
        query: `give the codes for a homepage of the indian tourism in html css js ""as a json response with key as filename and value as content"". GENERATE flask if absolutely necessary. Use routes assuming that all HTML pages are located in the same folder. DON'T GIVE ANY EXTRA OUTPUT THAN SPECIFIED. Use images from stable pixabay`
    });

    console.log(result.data);
}

main().catch(console.error);
