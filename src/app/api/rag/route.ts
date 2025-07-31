import { NextRequest } from "next/server"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
// Using custom embeddings instead of OpenAI
// import { OpenAIEmbeddings } from "@langchain/openai"
import { ChatOpenAI } from "@langchain/openai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"
import { formatDocumentsAsString } from "langchain/util/document"
// @ts-expect-error - pdf.js types are not available
import * as pdfjsLib from 'pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js'
import mammoth from 'mammoth'

// --- In-Memory Vector Store (for privacy) ---
let vectorStore: MemoryVectorStore | null = null
let documentCount = 0

// --- Document Processing Functions ---

async function extractTextFromFile(file: File): Promise<string> {
  try {
    console.log("Processing file:", file.name, "Type:", file.type)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    if (file.type === 'application/pdf') {
      console.log("Processing PDF file...")
      try {
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument({ data: buffer })
        const pdf = await loadingTask.promise
        
        // Extract text from all pages
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          const pageText = content.items
            .map((item: { str?: string }) => item.str || '')
            .join(' ')
          fullText += pageText + '\n'
        }
        
        if (!fullText || fullText.trim().length === 0) {
          throw new Error('Could not extract text from PDF. The file might be empty, corrupted, or password protected.')
        }
        
        console.log("Successfully extracted text from PDF")
        return fullText
      } catch (pdfError) {
        console.error("PDF processing error:", pdfError)
        throw new Error(`Failed to process PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`)
      }
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log("Processing DOCX file...")
      const result = await mammoth.extractRawText({ buffer })
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('Could not extract text from DOCX. The file might be empty or corrupted.')
      }
      return result.value
    } else if (file.type === 'text/plain') {
      console.log("Processing TXT file...")
      const text = buffer.toString('utf-8')
      if (!text || text.trim().length === 0) {
        throw new Error('The text file appears to be empty.')
      }
      return text
    } else {
      throw new Error(`Unsupported file type: ${file.type}. Please upload PDF, DOCX, or TXT files.`)
    }
  } catch (error) {
    console.error("Error extracting text from file:", error)
    throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function processDocument(text: string, filename: string) {
  // Initialize embeddings (using OpenRouter for cost-effectiveness)
  // Since OpenRouter doesn't support embeddings directly, we'll use a simpler approach
  const embeddings = {
    embedQuery: async (text: string) => {
      // Simple hash function for demo purposes
      const hash = text.split(' ').map(word => 
        word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      );
      // Normalize the hash values to be between -1 and 1
      return hash.map(h => (h % 100) / 50 - 1);
    },
    embedDocuments: async (texts: string[]) => {
      // Apply the same hash function to each document
      return texts.map(text => 
        text.split(' ').map(word => 
          word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100 / 50 - 1
        )
      );
    }
  }

  // Split text into chunks
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  })

  console.log(textSplitter, "Splitting text into chunks...")
  const docs = await textSplitter.createDocuments([text], [{ source: filename }])

  // Create or update vector store with custom similarity search
  const docEmbeddings = await embeddings.embedDocuments(docs.map(doc => doc.pageContent));
  
  if (!vectorStore) {
    vectorStore = new MemoryVectorStore(embeddings);
    await vectorStore.addVectors(docEmbeddings, docs);
  } else {
    await vectorStore.addVectors(docEmbeddings, docs);
  }

  documentCount += 1
  return docs.length
}

// --- RAG Query Function ---

async function queryDocuments(question: string) {
  if (!vectorStore) {
    throw new Error("No documents have been uploaded yet.")
  }

  if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "your_openrouter_api_key_here") {
    throw new Error("OpenRouter API key not configured")
  }

  // Initialize LLM
  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    modelName: "openai/gpt-3.5-turbo", // Using a more reliable model
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.VERCEL_URL || "http://localhost:3000",
        "X-Title": "AI Applications Demo",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      }
    },
    temperature: 0.2, // Lower temperature for more factual answers
    maxRetries: 3
  })

  // Create retriever
  const retriever = vectorStore.asRetriever({ k: 4 })

  // Create RAG prompt template
  const ragPrompt = ChatPromptTemplate.fromTemplate(`
Answer the question based only on the following context. If you cannot answer the question based on the context, say "I don't have enough information in the provided documents to answer this question."

Context: {context}

Question: {question}

Answer:`)

  // Create RAG chain
  const ragChain = RunnableSequence.from([
    {
      context: async (input: { question: string }) => {
        const docs = await retriever.getRelevantDocuments(input.question)
        return formatDocumentsAsString(docs)
      },
      question: (input: { question: string }) => input.question,
    },
    ragPrompt,
    llm,
  ])

  const result = await ragChain.invoke({ question })
  return result.content
}

// --- API Route Handlers ---

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (action === 'upload') {
      const formData = await req.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return Response.json({ success: false, error: "No file uploaded" }, { status: 400 })
      }

      // Extract text from file
      const text = await extractTextFromFile(file)
      
      // Process document and add to vector store
      const chunkCount = await processDocument(text, file.name)

      return Response.json({
        success: true,
        data: {
          filename: file.name,
          chunkCount,
          totalDocuments: documentCount,
          message: `Successfully processed ${file.name} into ${chunkCount} chunks.`
        }
      })

    } else if (action === 'query') {
      const { question } = await req.json()

      if (!question || typeof question !== "string") {
        return Response.json({ success: false, error: "Question is required" }, { status: 400 })
      }

      // Query the documents
      const answer = await queryDocuments(question)

      return Response.json({
        success: true,
        data: {
          question,
          answer,
          totalDocuments: documentCount
        }
      })

    } else if (action === 'clear') {
      // Clear the vector store
      vectorStore = null
      documentCount = 0

      return Response.json({
        success: true,
        data: { message: "All documents cleared from memory." }
      })

    } else {
      return Response.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

  } catch (error: unknown) {
    console.error("RAG API error:", error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('PDF')) {
        return Response.json(
          { 
            success: false, 
            error: error.message,
            details: "Please make sure the PDF is not password protected and contains extractable text."
          },
          { status: 400 }
        )
      }
      
      return Response.json(
        { 
          success: false, 
          error: error.message,
          details: error.cause
        },
        { status: 500 }
      )
    }
    
    return Response.json(
      { 
        success: false, 
        error: "An unknown error occurred",
        details: "Please try again or contact support if the issue persists."
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return Response.json({
    success: true,
    data: {
      totalDocuments: documentCount,
      hasDocuments: vectorStore !== null,
      status: vectorStore ? "Ready to answer questions" : "No documents uploaded"
    }
  })
}