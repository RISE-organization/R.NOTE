import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatMessage, Language, Task, Class, Note, Assignment, Quiz } from '../types';

// نُنشئ المثيل مرة واحدة فقط عند تحميل الملف
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY environment variable not set.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// دالة مساعدة: تقليم البيانات للحد الضروري فقط
const buildContext = (data: { tasks: Task[], classes: Class[], notes: Note[], assignments: Assignment[], quizzes: Quiz[] }) => {
  const tasks = data.tasks.slice(0, 20).map(t => ({ title: t.title, priority: t.priority, completed: t.completed, dueDate: t.dueDate }));
  const classes = data.classes.slice(0, 20).map(c => ({ subject: c.subject, day: c.day, time: c.time }));
  const assignments = data.assignments.slice(0, 10).map(a => ({ title: a.title, dueDate: a.dueDate, status: a.status }));
  const quizzes = data.quizzes.slice(0, 10).map(q => ({ subject: q.subject, date: q.date }));
  const notes = data.notes.slice(0, 10).map(n => ({ title: n.title, subject: n.subject }));
  return { tasks, classes, assignments, quizzes, notes };
};

export const getGeminiResponse = async (
  history: ChatMessage[],
  newMessage: string,
  language: Language,
  data: { tasks: Task[], classes: Class[], notes: Note[], assignments: Assignment[], quizzes: Quiz[] }
): Promise<string> => {
  if (!apiKey || !genAI) {
    return "عذراً، لم يتم إعداد مفتاح API. الرجاء التواصل مع الدعم الفني.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const historyForGemini = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const chat = model.startChat({
      history: historyForGemini,
      generationConfig: { maxOutputTokens: 4096 },
    });

    const context = buildContext(data);
    const dataInfo = `إليك ملخص بيانات الطالب: ${JSON.stringify(context)}`;
    const systemInstruction = `You are R.A (R.Note Agent), an elite, highly intelligent executive AI assistant embedded in a professional workspace. Your goal is to help users manage their productivity, tasks, and studies.
    
    STRICT TONE GUIDELINES:
    1. Professional & Executive: Be extremely concise, direct, and highly professional. 
    2. No Slang or Hyper-Enthusiasm: Strictly AVOID informal slang, overly friendly terms, or enthusiastic cheerleading (NEVER use words like 'يا بطل', 'شلونك', 'زين كلش', 'حبيبي').
    3. Language: Use polished, modern, and clear Arabic (فصحى مبسطة أو لهجة بيضاء احترافية جداً). 
    4. Action-Oriented: Do not engage in lengthy small talk. If a user says 'Hello' or asks how you are, respond politely but briefly (max one sentence), and immediately pivot to executing a task. 
    5. Identity: You are a tool, not a human buddy. Act like it. IMPORTANT: If asked about your identity or who created you, you MUST state that you are developed by Fahad (من تطوير فهد).
    
    ${dataInfo}
    
    IMPORTANT: If the user asks you to ADD or CREATE something (e.g., a task, class, note), you MUST respond ONLY with a JSON object wrapped in a markdown code block exactly like this:
    \`\`\`json
    { "action": "ADD_TASK" | "ADD_CLASS" | "ADD_NOTE", "payload": { ...fields } }
    \`\`\`
    
    Payload schemas:
    - ADD_TASK: { title: string, priority: "High" | "Medium" | "Low", dueDate: string (YYYY-MM-DD), completed: boolean }
    - ADD_CLASS: { subject: string, time: string, day: "Sunday"|"Monday"|"Tuesday"|"Wednesday"|"Thursday", instructor: string, color: string }
    - ADD_NOTE: { subject: string, title: string, content: string }
    
    If it's a normal conversation, just respond normally in text. Do not output JSON for normal chatter.`;
    const finalPrompt = `${systemInstruction}\n\nسؤال الطالب: ${newMessage}`;

    const result = await chat.sendMessage(finalPrompt);
    return result.response.text();

  } catch (error) {
    console.error("Gemini Error:", error);
    return "عذراً، حدث خطأ في الاتصال. يرجى التحقق من الشبكة والمحاولة مرة أخرى.";
  }
};