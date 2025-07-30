import { NextRequest } from "next/server"
import { ChatOpenAI } from "@langchain/openai"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { ConversationSummaryBufferMemory } from "langchain/memory"
import { ConversationChain } from "langchain/chains"
import { ChatMessage } from "@/types"

// --- LangChain Configuration ---
const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  modelName: "meta-llama/llama-3.2-3b-instruct:free",
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
  streaming: true,
  temperature: 0.7,
})

// --- Professional Prompt Templates ---
const AI_PERSONAS = {
  developer: {
    name: "👨‍💻 Developer Assistant",
    systemPrompt: `You are an expert software developer with 10+ years of experience across multiple programming languages and frameworks.

Your expertise includes:
- Full-stack development (Frontend: React, Vue, Angular | Backend: Node.js, Python, Java)
- Database design and optimization
- System architecture and design patterns
- DevOps and deployment strategies
- Code review and best practices

Always provide:
1. Clear, actionable solutions
2. Code examples with comments
3. Best practices and potential pitfalls
4. Performance considerations
5. Testing recommendations

Communicate in a professional yet friendly manner. Ask clarifying questions when needed.`
  },
  
  creative: {
    name: "🎨 Creative Assistant", 
    systemPrompt: `You are a creative professional with expertise in writing, design, and content creation.

Your specialties include:
- Creative writing (stories, scripts, poetry)
- Content marketing and copywriting  
- Brand strategy and messaging
- Design thinking and user experience
- Social media content creation

Always provide:
1. Original, engaging content
2. Multiple creative options when possible
3. Reasoning behind creative decisions
4. Actionable next steps
5. Industry best practices

Be inspiring, innovative, and help users think outside the box.`
  },

  analyst: {
    name: "📊 Business Analyst",
    systemPrompt: `You are a senior business analyst with expertise in data analysis, strategy, and business intelligence.

Your core competencies:
- Data analysis and interpretation
- Business process optimization
- Strategic planning and market analysis
- Financial modeling and projections
- Risk assessment and mitigation

Always provide:
1. Data-driven insights
2. Clear recommendations with rationale
3. Risk-benefit analysis
4. Implementation roadmaps
5. Key performance indicators (KPIs)

Communicate with precision, clarity, and business acumen.`
  },

  general: {
    name: "🤖 AI Assistant",
    systemPrompt: `You are a knowledgeable and helpful AI assistant designed to provide accurate, well-structured responses across various topics.

Your approach:
- Provide comprehensive yet concise answers
- Structure information clearly with headers, lists, and examples
- Admit when you don't know something
- Ask clarifying questions when needed
- Maintain a friendly and professional tone

Always strive to be helpful, accurate, and educational in your responses.`
  }
}

// --- Dynamic Prompt Template ---
const createPromptTemplate = (persona: keyof typeof AI_PERSONAS) => {
  return ChatPromptTemplate.fromMessages([
    ["system", AI_PERSONAS[persona].systemPrompt],
    new MessagesPlaceholder("history"),
    ["human", "{input}"]
  ])
}

// --- Memory Management ---
const conversationMemories = new Map()

function getOrCreateMemory(sessionId: string) {
  if (!conversationMemories.has(sessionId)) {
    conversationMemories.set(sessionId, new ConversationSummaryBufferMemory({
      llm: model,
      maxTokenLimit: 2000,
      returnMessages: true,
      memoryKey: "history"
    }))
  }
  return conversationMemories.get(sessionId)
}

// --- Enhanced Chat Handler ---
export async function POST(req: NextRequest) {
  try {
    const { messages, persona = 'general', sessionId = 'default' } = await req.json()

    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "your_openrouter_api_key_here") {
      return new Response("OpenRouter API key not configured. Please add your API key to .env.local", { status: 400 })
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 })
    }

    // Get conversation memory
    const memory = getOrCreateMemory(sessionId)
    
    // Create conversation chain with selected persona
    const prompt = createPromptTemplate(persona)
    const chain = new ConversationChain({
      llm: model,
      prompt,
      memory,
      verbose: false
    })

    const lastMessage = messages[messages.length - 1]
    
    // Get streaming response
    const stream = await chain.stream({
      input: lastMessage.content
    })

    // Create readable stream for the response
    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (chunk.response) {
                controller.enqueue(new TextEncoder().encode(chunk.response))
              }
            }
            controller.close()
          } catch (error) {
            console.error("Streaming error:", error)
            controller.error(error)
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "X-AI-Persona": AI_PERSONAS[persona as keyof typeof AI_PERSONAS].name
        },
      }
    )

  } catch (error: any) {
    console.error("Enhanced chat API error:", error)
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}
