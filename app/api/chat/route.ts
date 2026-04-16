import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import { cookies } from "next/headers";
import {
  generateEmbedding,
  searchChunks,
  getSessionMessages,
  saveSessionMessages,
} from "@/lib/mlbook-rag";

type ChatMsg = { role: "user" | "assistant"; content: string };

// Cloudflare Workers AI as an OpenAI-compatible provider
const cloudflare = createOpenAICompatible({
  name: "cloudflare",
  baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
  headers: {
    Authorization: `Bearer ${process.env.CLOUDFLARE_AI_API_TOKEN}`,
  },
});

const SYSTEM_PROMPT = `You are a study assistant for the textbook "Machine Learning and Artificial Intelligence: Concepts, Algorithms and Models" by Prof. Reza Rawassizadeh (Boston University).

Your role:
- Answer questions about machine learning concepts using ONLY the provided textbook context
- Use LaTeX notation for math (e.g. $P(A|B)$, $$\\nabla L(w)$$)
- Cite specific chapters and sections when referencing content
- Suggest related sections for further reading when relevant
- Keep explanations clear and accessible for students
- If the question is outside the book's scope, acknowledge it honestly

When citing sources, format them as: "See Chapter X, Section: Title"

Always be encouraging and pedagogical — you're helping students learn.`;

export async function POST(req: Request) {
  const { messages, context } = (await req.json()) as {
    messages: ChatMsg[];
    context?: {
      chapter?: number;
      section?: string;
      selectedText?: string;
    };
  };

  // Get or create session token
  const cookieStore = await cookies();
  let sessionToken = cookieStore.get("mlbook_session")?.value;
  if (!sessionToken) {
    sessionToken = crypto.randomUUID();
    cookieStore.set("mlbook_session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  // Get the latest user message
  const lastUserMessage = messages.filter((m) => m.role === "user").pop();
  if (!lastUserMessage) {
    return new Response("No user message", { status: 400 });
  }

  // Build the query — include selected text if provided
  let query = lastUserMessage.content;
  if (context?.selectedText) {
    query = `Context: "${context.selectedText}"\n\nQuestion: ${query}`;
  }

  // Retrieve relevant chunks via RAG
  let contextBlock = "";
  try {
    const embedding = await generateEmbedding(query);
    const chunks = await searchChunks(embedding, {
      chapter: context?.chapter,
      threshold: 0.5,
      count: 5,
    });

    if (chunks.length > 0) {
      contextBlock = chunks
        .map((c) => {
          const meta = c.metadata as Record<string, string>;
          return `--- Chapter ${c.chapter}, Section: ${meta.sectionTitle || c.section} ---\n${c.content}`;
        })
        .join("\n\n");
    }
  } catch (e) {
    console.error("RAG retrieval error:", e);
  }

  // Load session history for continuity
  const sessionHistory = await getSessionMessages(sessionToken);

  // Build the final system prompt with retrieved context
  const systemWithContext = contextBlock
    ? `${SYSTEM_PROMPT}\n\n## Textbook Context\n\n${contextBlock}`
    : `${SYSTEM_PROMPT}\n\nNote: No specific textbook passages were retrieved for this query. Answer based on your general knowledge of the topics covered in the book, but let the student know that you're providing a general answer.`;

  // Combine session history with current messages
  const conversationMessages = [
    ...sessionHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    ...messages,
  ];

  const result = streamText({
    model: cloudflare("@cf/meta/llama-3.1-8b-instruct"),
    system: systemWithContext,
    messages: conversationMessages,
  });

  // Save updated messages after streaming completes (fire-and-forget)
  result.text.then(async (text) => {
    const updatedMessages = [
      ...sessionHistory,
      { role: "user" as const, content: lastUserMessage.content },
      { role: "assistant" as const, content: text },
    ];
    await saveSessionMessages(sessionToken!, updatedMessages, {
      chapter: context?.chapter,
      section: context?.section,
    });
  });

  return result.toTextStreamResponse();
}
