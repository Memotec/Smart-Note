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

  // API Route: AI Assistant Meeting Minutes Form Creator
  app.post('/api/ai/meeting-minutes', async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Nội dung ghi chép trống, không thể tạo biên bản.' });
      }

      const ai = getAiClient();
      const currentDateString = new Date().toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const prompt = `Bạn là một Thư ký điều hành cấp cao chuyên nghiệp trong các Tập đoàn lớn tại Việt Nam.
Hãy chuyển đổi toàn bộ thông tin thảo luận dưới dạng nháp, ghi chú thô, hoặc nội dung ghi âm cuộc họp sau đây thành một cấu trúc "Biên bản cuộc họp" chuẩn hóa, trang trọng và đầy đủ tính pháp lý theo quy chuẩn hành chính Việt Nam.

Nội dung nguồn:
Title: "${title || 'Chưa đặt tên'}"
Content:
"${content}"

---
Yêu cầu biên bản họp (Sử dụng cấu trúc Markdown chi tiết và thẩm mỹ):
1. Phần Quốc hiệu & Tiêu đề trang trọng:
   CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
   Độc lập - Tự do - Hạnh phúc
   ---
2. Tên văn bản (In hoa, đậm, canh giữa/lớn):
   # BIÊN BẢN CUỘC HỌP
   ## V/v: [Trích xuất chủ đề cuộc họp hoặc dự án phù hợp]
3. Thông tin chung về cuộc họp (Nếu nội dung nguồn không có, hãy tự điền giả định hợp lý và điền chuyên nghiệp):
   - **Thời gian diễn ra:** [Ngày giờ trích xuất hoặc mặc định: ${currentDateString}]
   - **Địa điểm:** [Văn phòng họp Smart Notes / Phòng họp họp trực tuyến]
   - **Chủ trì cuộc họp (Chairperson):** [Trích xuất tên hoặc ghi: Ông/Bà Trưởng nhóm điều hành]
   - **Thư ký ghi nhận (Secretary):** [Thư ký trợ lý AI Smart Notes Pro]
   - **Thành phần tham dự:** [Trích xuất các tên thành viên trao đổi từ nội dung cuộc họp hoặc ghi: Ban điều hành dự án và các thành viên liên quan]
4. Mục đích & Chương trình nội dung (Agenda):
   - [Nêu tóm lược mục tiêu chính của cuộc thảo luận này]
5. Chi tiết tiến trình cuộc họp & Nội dung thảo luận (Phần này phải được diễn tả cực kỳ rõ ràng, khoa học dưới dạng phân bổ cụ thể theo từng chủ đề nghị sự hoặc phát biểu của từng vị trí tham dự):
   - [Trình bày rõ ràng thành các mục h3 hoặc bullet points chuyên nghiệp]
6. Kết luận chỉ đạo, Biện pháp giải quyết & Phân công công việc (Hành động / Action Items):
   - [Đặc biệt bóc tách rõ ràng các đầu việc cụ thể được giao phó cho ai, thời hạn hoàn thành (Deadline) chi tiết. Cung cấp danh sách dạng checklist Markdown: "- [ ] [Nhiệm vụ] - Phân công: [Tên người] - Deadline: [Thời gian]" để tối ưu thao tác theo dõi tiếp theo]
7. Phần ký tên xác nhận (Đầu ra giữ nguyên cấu trúc bảng ký tên trang nghiêm):
   | Chủ trì cuộc họp | Thư ký ghi biên bản |
   | :---: | :---: |
   | (Ký, ghi rõ họ tên) | (Ký, ghi rõ họ tên) |

Phong cách văn phong: Sử dụng từ ngữ chuẩn hành chính, từ vựng quản trị doanh nghiệp lịch thiệp, câu cú khúc chiết, chuẩn chính tả Việt Nam. Chỉ trả về mã Markdown của văn bản biên bản hoàn chỉnh.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Bạn là chuyên gia soạn thảo Biên bản cuộc họp chuẩn hành chính doanh nghiệp Việt Nam. Chỉ trả về định dáng Markdown hoàn mỹ.',
        }
      });

      const generatedMinutes = response.text || 'Không thể tạo biên bản từ dữ liệu thô.';
      
      // Propose automated metadata update too
      const suggestionPrompt = `Hãy đề xuất một tiêu đề biên bản họp ngắn gọn (ví dụ: "Biên bản họp dự án A" - tối đa 50 ký tự) và danh sách 2-3 tags phù hợp cho biên bản hành chính này ở định dạng JSON.
Đầu vào biên bản họp: "${generatedMinutes.substring(0, 500)}"`;

      const suggestionResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: suggestionPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedTitle: { type: Type.STRING },
              recommendedTags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['recommendedTitle', 'recommendedTags']
          }
        }
      });

      let suggestion = { recommendedTitle: '', recommendedTags: [] };
      try {
        suggestion = JSON.parse(suggestionResponse.text || '{}');
      } catch (e) {
        console.error('Failed to parse title suggestions:', e);
      }

      return res.json({
        minutes: generatedMinutes,
        suggestedTitle: suggestion.recommendedTitle,
        suggestedTags: suggestion.recommendedTags,
      });
    } catch (error: any) {
      console.error('Lỗi tạo Biên bản cuộc họp AI:', error);
      return res.status(500).json({ error: 'Không thể xử lý tạo Biên bản cuộc họp AI lúc này.' });
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
