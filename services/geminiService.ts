import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatMessage, Language, Task, Class, Note, Assignment, Quiz } from '../types';

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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return "عذراً، لم يتم إعداد مفتاح API. الرجاء التواصل مع الدعم الفني.";
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 1. إعداد السياق (Context)
    const context = buildContext(data);
    const dateStr = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });

    const systemText = `You are R.A (R.Note Agent), an elite executive AI assistant developed by Fahad.
Today: ${dateStr}, ${timeStr}.
CONTEXT: ${JSON.stringify(context)}
GUIDELINES: Professional, concise, neutral Arabic/English. Action-oriented.`;

    // 2. استخدام المكتبة الرسمية مع تهيئة الـ System Prompt بالطريقة الصحيحة
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: systemText // المكتبة تتكفل بحقنها بالسيرفر!
    });

    // 3. Sliding Window: أخذ آخر 6 رسائل فقط (لتقليل الكوتا)
    const trimmedHistory = history.slice(-6);
    const historyForGemini = trimmedHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // 4. بناء جلسة الشات
    const chat = model.startChat({
      history: historyForGemini,
      generationConfig: { maxOutputTokens: 2048 },
    });

    console.log(`Contacting R.A Assistant via SDK (gemini-2.5-flash)...`);

    // 5. إرسال رسالة المستخدم (فقط رسالته، بدون حشو الـ System Text)
    const result = await chat.sendMessage(newMessage.trim());
    return result.response.text();

  } catch (error: any) {
    console.error(`R.A Connection Error:`, error);
    
    // اقتناص خطأ الـ 429 (Rate Limit) من داخل رسالة خطأ المكتبة
    if (error.message?.includes('429') || error.status === 429) {
        return "__RATE_LIMIT_EXCEEDED__";
    }

    return language === 'ar'
      ? "عذراً، حدث خطأ في الاتصال بالسيرفر. يرجى التأكد من مفتاح الـ API وصحته."
      : "Sorry, a connection error occurred. Please verify your API key.";
  }
};