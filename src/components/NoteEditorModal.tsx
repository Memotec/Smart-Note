/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Bell, ShieldAlert, Paperclip, Upload, RefreshCw, Trash2, ChevronRight, Sparkles, Loader2, Bookmark, CheckSquare } from 'lucide-react';
import { Note, Attachment, Priority, NoteStatus } from '../types';
import { fileToBase64, formatBytes, getFileGroup } from '../utils';

interface NoteEditorModalProps {
  note: Note | null; // Null if creating a new note
  onClose: () => void;
  onSave: (noteData: Omit<Note, 'id' | 'created'> & { id?: string }) => void;
  isOpen: boolean;
}

export default function NoteEditorModal({ note, onClose, onSave, isOpen }: NoteEditorModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority>('low');
  const [status, setStatus] = useState<NoteStatus>('none');
  const [tags, setTags] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [remindTime, setRemindTime] = useState('');
  const [remindBefore, setRemindBefore] = useState('0');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize when active note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setPriority(note.priority || 'low');
      setStatus(note.status || 'none');
      setTags(note.tags || []);
      setTagsInput('');
      setRemindTime(note.remindTime || '');
      setRemindBefore(note.remindBefore || '0');
      setAttachments(note.files || []);
    } else {
      handleClear();
    }
  }, [note, isOpen]);

  const handleClear = () => {
    setTitle('');
    setContent('');
    setPriority('low');
    setStatus('none');
    setTags([]);
    setTagsInput('');
    setRemindTime('');
    setRemindBefore('0');
    setAttachments([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const processFiles = async (fileList: FileList) => {
    const newAttachments: Attachment[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const base64Data = await fileToBase64(file);
        newAttachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64Data,
        });
      } catch (err) {
        console.error('Lỗi chuyển đổi tệp:', err);
      }
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleDeleteAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagsInput.trim().replace(/,/g, '');
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
      }
      setTagsInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleAiAnalyze = async () => {
    if (!content.trim()) {
      alert('Vui lòng nhập một số nội dung chi tiết trước khi sử dụng trợ lý AI phân tích!');
      return;
    }
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });
      if (!response.ok) {
        throw new Error('Thất bại khi lấy dữ liệu phân tích từ AI');
      }
      const data = await response.json();
      if (data.title) setTitle(data.title);
      if (data.priority) setPriority(data.priority);
      if (data.tags && Array.isArray(data.tags)) setTags(data.tags);
    } catch (err) {
      console.error(err);
      alert('Trợ lý AI chưa phản hồi. Vui lòng thử lại sau.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Nhập đầy đủ thông tin: Tiêu đề và Nội dung!');
      return;
    }
    onSave({
      id: note?.id,
      title: title.trim(),
      content: content.trim(),
      priority,
      status,
      tags,
      remindTime,
      remindBefore,
      files: attachments,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm justify-center items-center z-50 p-4 flex overflow-y-auto">
      <div 
        className="glass-panel w-full max-w-2xl rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-700/80 animate-in zoom-in-95 duration-200"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm border-2 border-dashed border-blue-400 rounded-3xl flex flex-col items-center justify-center z-50 pointer-events-none">
            <Upload className="w-12 h-12 text-blue-400 animate-bounce mb-3" />
            <p className="text-lg font-bold text-blue-300">Thả tệp đính kèm vào đây để tải lên</p>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✍️</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100">
              {note ? 'CẬP NHẬT GHI CHÚ' : 'SOẠN GHI CHÚ MỚI'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700/60 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form elements */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Tiêu đề ghi chú
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Điền tiêu đề..."
              className="w-full bg-slate-850 text-slate-100 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700/60 text-sm sm:text-base placeholder-slate-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Nội dung chi tiết
            </label>
            <textarea
              id="content"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung ghi chú ở đây..."
              className="w-full bg-slate-850 text-slate-100 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700/60 text-sm sm:text-base placeholder-slate-500 min-h-[140px]"
              required
            ></textarea>
          </div>

          {/* AI Assistant Help box */}
          <div className="bg-gradient-to-r from-slate-800/60 to-indigo-950/20 border border-indigo-550/15 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex gap-2.5 items-start">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-300">Trợ lý AI Đề xuất (AI Suggestor)</p>
                <p className="text-[11px] text-slate-400">Gemini sẽ phân tích nội dung để đề xuất tiêu đề tối ưu, tags hữu ích & mức ưu tiên khẩn cấp.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAiAnalyze}
              disabled={isAnalyzing}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 select-none cursor-pointer disabled:opacity-55"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang phân tích...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gợi ý thông minh (AI)
                </>
              )}
            </button>
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                Độ ưu tiên
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-slate-850 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700/60 text-sm"
              >
                <option value="high">🔴 Khẩn cấp (Cao)</option>
                <option value="medium">🟠 Quan trọng (Vừa)</option>
                <option value="low">🟢 Bình thường (Thấp)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-sky-400" />
                Trạng thái hoạt động
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as NoteStatus)}
                className="w-full bg-slate-850 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700/60 text-sm"
              >
                <option value="none">📝 Ghi chú thông thường</option>
                <option value="todo">⏳ To-Do (Chưa Đạt)</option>
                <option value="doing">⚡ Đang Thực Hiện</option>
                <option value="done">✅ Đã Hoàn Thành</option>
              </select>
            </div>
          </div>

          {/* Tags manager */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-rose-400" />
              Nhãn ghi chú (Tags)
            </label>
            <div className="w-full bg-slate-850 rounded-xl p-3 border border-slate-700/60">
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.length === 0 ? (
                  <span className="text-xs text-slate-500">Chưa xếp nhãn nào cho ghi nhớ này.</span>
                ) : (
                  tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 animate-in zoom-in-75 duration-100"
                    >
                      #{tag}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:bg-indigo-500/20 rounded-full p-0.5 text-indigo-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => {
                  if (e.target.value.endsWith(',') || e.target.value.endsWith(' ')) {
                    const clean = e.target.value.trim().replace(/,/g, '');
                    if (clean && !tags.includes(clean)) {
                      setTags([...tags, clean]);
                    }
                    setTagsInput('');
                  } else {
                    setTagsInput(e.target.value);
                  }
                }}
                onKeyDown={handleAddTag}
                placeholder="Nhập nhãn và gõ 'Dấu phẩy' hoặc 'Phím cách' để thêm..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
          </div>

          {/* Grid fields layout continuation */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                Hẹn giờ nhắc nhở
              </label>
              <input
                id="remindTime"
                type="datetime-local"
                value={remindTime}
                onChange={(e) => setRemindTime(e.target.value)}
                className="w-full bg-slate-850 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700/60 text-sm [color-scheme:dark]"
              />
            </div>
          </div>

          {remindTime && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-150">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-400" />
                Thời gian báo trước
              </label>
              <select
                id="remindBefore"
                value={remindBefore}
                onChange={(e) => setRemindBefore(e.target.value)}
                className="w-full bg-slate-850 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700/60 text-sm/relaxed"
              >
                <option value="0">Đúng giờ</option>
                <option value="5">Trước 5 phút</option>
                <option value="10">Trước 10 phút</option>
                <option value="15">Trước 15 phút</option>
                <option value="30">Trước 30 phút</option>
                <option value="60">Trước 1 giờ</option>
                <option value="1440">Trước 1 ngày</option>
              </select>
            </div>
          )}

          {/* Attachments controller */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-indigo-400" />
              Tệp tin đính kèm
            </label>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-850/50 border border-dashed border-slate-700 hover:border-slate-600 rounded-xl p-5 text-center transition-colors cursor-pointer group"
            >
              <input
                type="file"
                id="attachment"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
              />
              <Upload className="w-8 h-8 text-slate-500 group-hover:text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                Nhấp vào đây hoặc kéo thả tập tin để tải lên
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Hỗ trợ Hình ảnh, PDF, Word, Excel (Ảnh hoặc Tài liệu tối đa 5MB)
              </p>
            </div>

            {/* List uploaded files */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {attachments.map((file, idx) => {
                  const fileMeta = getFileGroup(file.type, file.name);
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs gap-3"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base select-none">{fileMeta.icon}</span>
                        <div className="truncate">
                          <p className="font-bold text-slate-300 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {fileMeta.label} • {formatBytes(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(idx)}
                        className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Xóa tệp đính kèm này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CTA actions */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClear}
              className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-3.5 rounded-xl text-sm transition-colors cursor-pointer"
            >
              🗑 Thiết lập lại (Clear)
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-indigo-900/10 cursor-pointer"
            >
              💾 Lưu ghi chú
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
