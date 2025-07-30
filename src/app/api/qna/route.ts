import { NextRequest } from "next/server"
import { ChatOpenAI } from "@langchain/openai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { QnAResult } from "@/types"

// --- LangChain Configuration ---
const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  modelName: "meta-llama/llama-3.2-3b-instruct:free",
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
  temperature: 0.2, // Lower temperature for more factual answers
})

// --- Q&A Prompt Template ---
const qaPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a highly knowledgeable Q&A assistant. Your goal is to provide accurate, concise, and well-structured answers to the user's questions. If you don't know the answer, say so. 

Here are your instructions:
1.  **Analyze the question**: Understand the user's intent and what they are asking.
2.  **Provide a direct answer**: Start with a direct answer to the question.
3.  **Elaborate with details**: Provide additional context, examples, or explanations to support your answer.
4.  **Structure your response**: Use lists, bullet points, and bolding to make the information easy to digest.
5.  **Be concise**: Do not provide irrelevant information.
6.  **Maintain a professional tone**: Be helpful, polite, and respectful.`,
  ],
  ["human", "Question: {question}\n\nContext (if any):\n{context}"],
])

const qaChain = qaPrompt.pipe(llm)

// --- Main API Route ---
export async function POST(req: NextRequest) {
  try {
    const { question, context = "" } = await req.json()

    if (!question || typeof question !== "string") {
      return Response.json({ success: false, error: "Question is required" }, { status: 400 })
    }

    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "your_openrouter_api_key_here") {
      return new Response("OpenRouter API key not configured", { status: 400 })
    }

    const result = await qaChain.invoke({ question, context })

    const qnaResult: QnAResult = {
      question,
      answer: result.content as string,
      context,
      confidence: 95, // Placeholder confidence
    }

    return Response.json({ success: true, data: qnaResult })

  } catch (error: any) {
    console.error("Q&A API error:", error)
    return Response.json(
      { success: false, error: `Server error: ${error.message}` },
      { status: 500 }
    )
  }
}

