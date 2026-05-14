import "dotenv/config";
import { ChatMistralAI } from "@langchain/mistralai"
import { listFiles, readFiles, updateFiles } from "./tools.js";
import { createAgent } from "langchain";

const model = new ChatMistralAI({
    model: "mistral-medium-latest",
    apiKey: process.env.MISTRALAI_API_KEY,
    "temperature": 0.7,
})

const agent = createAgent({
    model,
    tools: [ listFiles, readFiles, updateFiles ],
})

await agent.invoke({
    messages: [
        {
            role: "user",
            content: "create a simple snake game in the project using react and css."
        }
    ]
})