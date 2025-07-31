# AI Applications - Technology Stack Overview

## 🏗️ **Core Framework & Libraries**

### **Frontend**
- **Next.js 15** - React framework with App Router
- **React 18** - UI library with hooks
- **TypeScript** - Type safety and better development experience
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Modern icon library

### **Backend**
- **Next.js API Routes** - Built-in backend functionality
- **Node.js** - JavaScript runtime environment

### **State Management**
- **React useState/useEffect** - Built-in state management
- **UUID** - Unique identifier generation

## 🤖 **AI Providers & APIs (FREE TIERS)**

### **1. OpenRouter.ai (Primary)**
- **Free Tier**: $1/month credits
- **Models Used**:
  - `meta-llama/llama-3.2-3b-instruct:free` - Chat/Q&A
  - `gpt-3.5-turbo` - General conversation
- **Applications**: Chatbot, Q&A
- **Library**: `openai` npm package

### **2. Google Gemini API**
- **Free Tier**: 15 requests/minute, 1M tokens/month
- **Models Used**:
  - `gemini-1.5-flash` - Fast text generation
  - `gemini-1.5-pro` - Complex reasoning (limited)
- **Applications**: Chatbot (fallback), Q&A, Text Classification
- **Library**: `@google/generative-ai`

### **3. Hugging Face Inference API**
- **Free Tier**: 1,000 requests/month per model
- **Models Used**:
  - `facebook/bart-large-cnn` - Text Summarization
  - `cardiffnlp/twitter-roberta-base-sentiment-latest` - Sentiment Analysis
  - `microsoft/DialoGPT-medium` - Conversational AI
  - `distilbert-base-uncased-finetuned-sst-2-english` - Text Classification
- **Applications**: Summarization, Classification, Sentiment Analysis
- **Library**: Custom fetch requests to HF API

### **4. Replicate**
- **Free Tier**: Limited monthly usage
- **Models Used**:
  - `salesforce/blip` - Image to Text (OCR alternative)
  - `paddlepaddle/paddleocr` - OCR text extraction
- **Applications**: OCR, Image Analysis
- **Library**: Custom API integration

## 🧠 **Advanced AI Libraries**

### **LangChain.js**
- **Purpose**: Advanced prompt engineering and conversation management
- **Features**:
  - Prompt templates
  - Conversation memory
  - Chain operations
  - Context management
- **Libraries**:
  - `langchain` - Core functionality
  - `@langchain/openai` - OpenAI integration
  - `@langchain/core` - Core components
- **Applications**: Enhanced Chatbot, Complex Q&A

## 📊 **Application-Specific Tech Stack**

### **1. Chatbot Applications**
```json
{
  "basic_chatbot": {
    "apis": ["OpenRouter.ai", "Google Gemini"],
    "models": ["llama-3.2-3b-instruct", "gemini-1.5-flash"],
    "libraries": ["openai", "@google/generative-ai"],
    "features": ["Streaming responses", "Provider fallback", "Error handling"]
  },
  "enhanced_chatbot": {
    "apis": ["OpenRouter.ai"],
    "models": ["llama-3.2-3b-instruct"],
    "libraries": ["langchain", "@langchain/openai", "@langchain/core"],
    "features": ["AI personas", "Conversation memory", "Prompt templates", "Session management"]
  }
}
```

### **2. Text Summarization**
```json
{
  "primary_api": "Hugging Face Inference API",
  "fallback_api": "Google Gemini",
  "models": [
    "facebook/bart-large-cnn",
    "microsoft/prophetnet-large-uncased-cnndm",
    "t5-base"
  ],
  "libraries": ["Custom fetch", "@google/generative-ai"],
  "features": ["Multiple summary lengths", "Extractive/Abstractive options", "Word count analysis"]
}
```

### **3. Image to Text (OCR)**
```json
{
  "primary_api": "Replicate",
  "fallback_api": "Hugging Face",
  "models": [
    "paddlepaddle/paddleocr",
    "salesforce/blip",
    "microsoft/trocr-base-printed"
  ],
  "libraries": ["Custom API integration"],
  "features": ["Multiple image formats", "Confidence scores", "Language detection"]
}
```

### **4. Text Classification**
```json
{
  "primary_api": "Hugging Face Inference API",
  "fallback_api": "Google Gemini",
  "models": [
    "distilbert-base-uncased-finetuned-sst-2-english",
    "cardiffnlp/twitter-roberta-base-sentiment-latest",
    "facebook/bart-large-mnli"
  ],
  "libraries": ["Custom fetch", "@google/generative-ai"],
  "features": ["Sentiment analysis", "Topic classification", "Custom categories"]
}
```

### **5. Question & Answer**
```json
{
  "primary_api": "OpenRouter.ai",
  "fallback_api": "Google Gemini",
  "models": [
    "meta-llama/llama-3.2-3b-instruct",
    "gemini-1.5-flash"
  ],
  "libraries": ["openai", "@google/generative-ai", "langchain"],
  "features": ["Context-aware answers", "Source referencing", "Confidence scoring"]
}
```

## 🔧 **Development Tools**

### **Code Quality**
- **ESLint** - Code linting
- **TypeScript** - Type checking
- **Prettier** (optional) - Code formatting

### **Environment Management**
- **.env.local** - Environment variables
- **dotenv** - Environment variable loading

### **Utilities**
- **uuid** - Unique ID generation
- **crypto** (Node.js built-in) - Hashing and security

## 📈 **Free Tier Limitations & Usage**

| Service | Free Limit | Reset Period | Cost After |
|---------|------------|--------------|------------|
| OpenRouter.ai | $1 credit | Monthly | Pay per use |
| Google Gemini | 15 req/min, 1M tokens | Monthly | $0.00075/1K tokens |
| Hugging Face | 1000 req/model | Monthly | Paid plans available |
| Replicate | Limited usage | Monthly | Pay per run |

## 🚀 **Deployment Options**

- **Vercel** - Next.js optimized hosting (Free tier available)
- **Netlify** - Static site hosting (Free tier available)
- **Railway** - Full-stack hosting (Free tier available)

## 📝 **Key Features Implemented**

- ✅ **Streaming responses** for real-time chat experience
- ✅ **Provider fallback system** for reliability
- ✅ **TypeScript integration** for type safety
- ✅ **Responsive design** with Tailwind CSS
- ✅ **Error handling** with user-friendly messages
- ✅ **Session management** for conversation continuity
- ✅ **Professional prompt templates** with LangChain
- ✅ **Memory management** for context awareness
