import { GoogleGenerativeAI } from "@google/generative-ai";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../src/lib/firebase";
import { ChatMessage, Language, Task, Class, Note, Assignment, Quiz } from '../types';
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

export const getGeminiResponse = async (history: ChatMessage[], newMessage: string, language: Language, data: { tasks: Task[], classes: Class[], notes: Note[], assignments: Assignment[], quizzes: Quiz[] }): Promise<string> => {
  if (!apiKey) {
    return "عذراً، لم يتم إعداد مفتاح API. الرجاء التواصل مع الدعم الفني.";
  }

  const trimmedMessage = newMessage.trim();
  const safeCacheId = encodeURIComponent(trimmedMessage).replace(/\./g, '%2E');
  const personalKeywords = ['مهمة', 'مهام', 'جدول', 'واجب', 'اختبار', 'كوز', 'عندي', 'اليوم', 'دروسي', 'نظم', 'ذكرني', 'امتحان'];
  const isPersonal = personalKeywords.some(keyword => trimmedMessage.toLowerCase().includes(keyword)) || trimmedMessage.length > 200;

  // --- 1. Selective Cache Check (Firestore) ---
  if (!isPersonal) {
    try {
      const cacheRef = doc(db, 'ai_answers_cache', safeCacheId);
      const cacheSnap = await getDoc(cacheRef);
      
      if (cacheSnap.exists()) {
        const cacheData = cacheSnap.data();
        if (cacheData.expireAt > Date.now()) {
          console.log("RA Cache Hit for:", trimmedMessage);
          return cacheData.response;
        }
      }
    } catch (cacheError) {
      console.warn("Cache Read Failure (Graceful Fallback):", cacheError);
    }
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // 2. تقليل حجم البيانات المبعوثة (إرسال المهام غير المكتملة فقط مثلاً لتوفير التوكنات)
    // نصيحة: لا ترسل كل الملاحظات إذا كانت طويلة، أرسل فقط العناوين أو المهام النشطة.
    const dataInfo = `مهام الطالب: ${JSON.stringify(data.tasks.slice(0, 10))}, اختبارات: ${JSON.stringify(data.quizzes)}`;

    // 2. دمج تعليمات النظام بداخل الموديل مباشرة
    const now = new Date();
    const dateStr = now.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: `أنت مساعد طلابي ذكي اسمه R.Note AI، وأنت مساعد ذكي مطور من قبل "أستاذ فهد".
        تاريخ اليوم: ${dateStr}، والوقت الآن: ${timeStr}.
        هدفك مساعدة الطالب في تنظيم وقته ودراسته بناءً على بياناته: ${dataInfo}. 
        قواعد هامة جداً:
        - إذا سألك أحد "من أنت؟" أو "منو طورك؟" أو عن تاريخ اليوم أو الوقت، أجب بدقة.
        - تأكد دائماً أنك تذكر أنك "مساعد ذكي مطور من قبل أستاذ فهد".
        - تكلم باللهجة العراقية الودودة.
        - كن مختصراً ومباشراً.
        - لا تكرر الترحيب (مثل هلا بيك) في كل رسالة، رحب مرة واحدة فقط في بداية المحادثة.
        - أجب على سؤال الطالب فقط ولا تضف معلومات غير مطلوبة.`
    });

    const historyForGemini = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const chat = model.startChat({
      history: historyForGemini,
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    // 3. إرسال رسالة الطالب "فقط" بدون أي حشو إضافي
    const result = await chat.sendMessage(newMessage); 
    const geminiText = result.response.text();

    // --- 4. Asynchronous Cache Save (Firestore) ---
    if (!isPersonal && geminiText) {
      setDoc(doc(db, 'ai_answers_cache', safeCacheId), {
        query: trimmedMessage,
        response: geminiText,
        expireAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days TTL
      }).catch(err => console.error("Cache Save Error:", err));
    }

    return geminiText;

  } catch (error) {
    console.error("Gemini Error:", error);
    return "آسف، صار عندي خلل بسيط بالاتصال. تأكد من النت وحاول مرة ثانية.";
  }
};