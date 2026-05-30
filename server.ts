/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load system secrets
dotenv.config();

// Lazily initialize the Google Gen AI client with appropriate safety measures
let _aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!_aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      // Graceful fallback for local development if key is missing
      console.warn('Cảnh báo: GEMINI_API_KEY không tồn tại trong môi trường. Các tính năng AI sẽ tạm dừng hoạt động.');
    }
    _aiClient = new GoogleGenAI({
      apiKey: key || 'MOCK_API_KEY',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return _aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON request parsers for safe document exchange
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API Route: AI Assistant Analyze Note Draft
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Nội dung ghi chép không được để trống.' });
      }

      const ai = getAiClient();
      const prompt = `Hãy đóng vai trò một trợ lý hiệu suất tổ chức công việc chuyên nghiệp.
Phân tích tiêu đề nháp: "${title || 'Không có tiêu đề'}" và nội dung nháp: "${content}".

Nhiệm vụ của bạn là:
1. Đề xuất một tiêu đề tiếng Việt thông minh, rõ ràng, gãy gọn súc tích (tối đa 50 ký tự).
2. Trích xuất hoặc phân bổ 2-4 nhãn (tags) tiếng Việt phù hợp (ví dụ: "CôngViệc", "ÝTưởng", "HỗTrợ", "CáNhân", "SứcKhỏe", "TàiChính").
3. Dự đoán mức độ khẩn cấp/quan trọng (priority) phù hợp nhất với ngữ cảnh công việc. Chọn chính xác một trong ba giá trị sau: "high", "medium", "low". (Ví dụ: Các mốc deadline, khẩn cấp sẽ có priority "high".)`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Bạn là chuyên gia phân tích tài liệu và cấu trúc công việc cá nhân bằng tiếng Việt.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Tiêu đề thông minh tối ưu đề xuất' },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Danh sách các nhãn công việc đơn gọn gàng viết liền không dấu hoặc gạch dưới'
              },
              priority: { type: Type.STRING, description: 'Bắt buộc chọn một trong: "high", "medium", "low"' }
            },
            required: ['title', 'tags', 'priority']
          }
        }
      });

      const responseText = response.text || '{}';
      const aiResult = JSON.parse(responseText);
      return res.json(aiResult);
    } catch (error: any) {
      console.error('Lỗi xử lý AI Analyze:', error);
      return res.status(500).json({
        error: 'Tính năng Phân tích AI tạm thời gặp sự cố kết nối. Vui lòng thử lại sau.'
      });
    }
  });

  // API Route: AI Assistant Note Summarizer
  app.post('/api/ai/summarize', async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Nội dung ghi chú trống, không thể tóm tắt.' });
      }

      const ai = getAiClient();
      const prompt = `Viết một tóm tắt ngắn bằng tiếng Việt dưới dạng 2 đến 3 gạch đầu dòng súc tích, làm nổi bật thông tin cốt lõi nhất của tài liệu sau đây để người dùng nắm bắt trong 5 giây.
Tiêu đề: ${title || 'Chưa đặt tiêu đề'}
Nội dung: ${content}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Hãy là một thư ký điều hành chuyên nghiệp tóm tắt cực ngắn gọn thông tin cốt lõi nhất.',
        }
      });

      return res.json({ summary: response.text || 'Ghi chú quá ngắn gọn hoặc chưa thể tóm tắt.' });
    } catch (error: any) {
      console.error('Lỗi AI Summarizer:', error);
      return res.status(500).json({ error: 'Trợ lý AI tóm tắt chưa thể phản hồi lúc này.' });
    }
  });

  // API Route: AI Assistant Actionable Checklist Creator
  app.post('/api/ai/checklist', async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Không tìm thấy nội dung ghi chú.' });
      }

      const ai = getAiClient();
      const prompt = `Dựa vào tài liệu ghi chép: "${content}" (Tiêu đề: "${title || 'Nháp'}").
Hãy bóc tách và phân rã nó thành các đầu việc (Action Items) cụ thể có thể tích chọn và hoàn thành (checklist).
Mỗi đầu việc phải rõ ràng, ngắn gọn, hành động trực tiếp.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Bạn là chuyên gia bóc tách đầu việc thông minh. Chỉ trả về một danh sách các đầu việc hành động.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Danh sách các đầu việc hành động bằng tiếng Việt'
          }
        }
      });

      const responseText = response.text || '[]';
      const checklistItems = JSON.parse(responseText);
      return res.json({ checklist: checklistItems });
    } catch (error: any) {
      console.error('Lỗi tạo Checklist AI:', error);
      return res.status(500).json({ error: 'Trợ lý AI tạo checklist gặp gián đoạn ngoại cảnh.' });
    }
  });

  // Health probe endpoint
  app.get('/api/health', (req, res) => {
    return res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Vite middleware installation for elegant local development and fallback
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Active listener binding
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Smart Notes Server] Full-Stack application is active at http://localhost:${PORT}`);
  });
}

startServer();
