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
      generationConfig: { maxOutputTokens: 1000 },
    });

    const context = buildContext(data);
    const dataInfo = `إليك ملخص بيانات الطالب: ${JSON.stringify(context)}`;
    const systemInstruction = `أنت مساعد طلابي ذكي اسمه R.Note AI. هدفك مساعدة الطالب في تنظيم وقته ودراسته. ${dataInfo}. تكلم باللهجة العراقية الودودة أو العربية الفصحى حسب لغة الطالب. كن مختصراً ومباشراً. 
    
    IMPORTANT: If the user asks you to ADD or CREATE something (e.g., a task, class, note, or quiz), you MUST output ONLY a valid JSON object. DO NOT output any conversational text. DO NOT use markdown code blocks like \`\`\`json. Your response must start exactly with { and end exactly with }.
    
    { "action": "ADD_TASK" | "ADD_CLASS" | "ADD_NOTE" | "ADD_QUIZ", "payload": { ...fields } }
    
    Payload schemas:
    - ADD_TASK: { title: string, priority: "High" | "Medium" | "Low", dueDate: string (YYYY-MM-DD), completed: boolean }
    - ADD_CLASS: { subject: string, time: string, day: "Sunday"|"Monday"|"Tuesday"|"Wednesday"|"Thursday", instructor: string, color: string }
    - ADD_NOTE: { subject: string, title: string, content: string }
    - ADD_QUIZ: { subject: string, date: string (YYYY-MM-DD) }
    
    IMPORTANT DATE RULE: Always format dates as exactly "YYYY-MM-DD" inside the JSON payload.
    
    If it's a normal conversation, just respond normally in text. Do not output actual JSON for normal chatter.`;
    const finalPrompt = `${systemInstruction}\n\nسؤال الطالب: ${newMessage}`;

    const result = await chat.sendMessage(finalPrompt);
    return result.response.text();

  } catch (error) {
    console.error("Gemini Error:", error);
    return "آسف، صار عندي خلل بسيط بالاتصال. تأكد من النت وحاول مرة ثانية.";
  }
};