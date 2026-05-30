/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar, Bell, Shield, Download, FileText, Image as ImageIcon, Sparkles, Loader2, Copy, Check, ListTodo, CheckSquare } from 'lucide-react';
import { Note } from '../types';
import { formatDate, getPriorityMetadata, formatBytes, getFileGroup, getStatusMetadata } from '../utils';

interface NoteDetailModalProps {
  note: Note | null;
  onClose: () => void;
  isOpen: boolean;
  onSaveAiData?: (noteId: string, aiData: { aiSummary?: string; aiChecklist?: string[] }) => void;
}

export default function NoteDetailModal({ note, onClose, isOpen, onSaveAiData }: NoteDetailModalProps) {
  const [localSummary, setLocalSummary] = useState('');
  const [localChecklist, setLocalChecklist] = useState<string[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Reset states when note changes or modal reopens
  useEffect(() => {
    if (note) {
      setLocalSummary(note.aiSummary || '');
      setLocalChecklist(note.aiChecklist || []);
      setCheckedItems({});
    }
  }, [note, isOpen]);

  if (!isOpen || !note) return null;

  const metadata = getPriorityMetadata(note.priority);
  const statusMeta = getStatusMetadata(note.status);
  const fileCount = note.files?.length || 0;

  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: note.title, content: note.content }),
      });
      if (!response.ok) throw new Error('summarize error');
      const data = await response.json();
      const sumText = data.summary || '';
      setLocalSummary(sumText);
      
      // Auto save to persistent storage
      if (onSaveAiData) {
        onSaveAiData(note.id, { aiSummary: sumText });
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi gọi trợ lý AI Tóm tắt. Vui lòng thử lại sau.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGenerateChecklist = async () => {
    setLoadingChecklist(true);
    try {
      const response = await fetch('/api/ai/checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: note.title, content: note.content }),
      });
      if (!response.ok) throw new Error('checklist error');
      const data = await response.json();
      const list = data.checklist || [];
      setLocalChecklist(list);

      // Auto save to persistent storage
      if (onSaveAiData) {
        onSaveAiData(note.id, { aiChecklist: list });
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi gọi trợ lý AI tạo Checklist. Vui lòng thử lại sau.');
    } finally {
      setLoadingChecklist(false);
    }
  };

  const handleCopySummary = () => {
    if (!localSummary) return;
    navigator.clipboard.writeText(localSummary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const toggleCheckedItem = (idx: number) => {
    setCheckedItems(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm justify-center items-center z-50 p-4 flex overflow-y-auto">
      <div className="glass-panel w-full max-w-3xl rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-700/80 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex justify-between items-start gap-4 mb-5 pb-4 border-b border-slate-800">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h2 id="detailTitle" className="text-2xl sm:text-3xl font-extrabold text-slate-100 break-words leading-tight">
              {note.title || 'Không có tiêu đề'}
            </h2>
            <div id="detailDate" className="flex items-center gap-1.5 text-slate-400 text-xs sm:text-sm">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Được tạo lúc: {formatDate(note.created)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700/60 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Priority & Status & Tags Banner if present */}
        <div className="flex flex-wrap gap-2.5 mb-6">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${metadata.badgeColor}`}>
            <span>{metadata.icon}</span>
            <span>Ưu tiên: {metadata.label}</span>
          </span>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${statusMeta.badgeColor}`}>
            <span>{statusMeta.icon}</span>
            <span>Trạng thái: {statusMeta.label}</span>
          </span>

          {note.remindTime && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/15">
              <Bell className="w-4 h-4 text-amber-400" />
              <span>
                Hẹn nhắc: {formatDate(note.remindTime)}
              </span>
            </span>
          )}
        </div>

        {/* Tags view block */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5 items-center">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mr-1">Nhãn:</span>
            {note.tags.map((tag) => (
              <span key={tag} className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/15 text-indigo-300">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Content body */}
        <div className="bg-slate-850/40 rounded-2xl p-5 border border-slate-800/80 mb-6">
          <div 
            id="detailContent" 
            className="whitespace-pre-wrap text-slate-200 text-sm sm:text-base leading-relaxed font-normal"
          >
            {note.content || <em className="text-slate-500">Không có dữ liệu văn bản nào.</em>}
          </div>
        </div>

        {/* --- DÀNH RIÊNG CHO TRỢ LÝ THÔNG MINH AI CO-PILOT --- */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/15 rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-indigo-500/10">
            <div className="flex items-center gap-2">
              <div className="p-1 px-1.5 bg-indigo-500/20 text-indigo-400 font-bold rounded-lg text-xs leading-none animate-pulse">✨ AI</div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-indigo-200">Trợ Lý Phân Tích Công Việc AI</h3>
            </div>
            <div className="text-[10px] text-indigo-400 font-mono">Gemini 3.5 Active</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* AI Summarizer Block */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">📝 Tóm tắt nhanh ý chính</span>
                {localSummary && (
                  <button 
                    onClick={handleCopySummary}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors bg-indigo-500/5 px-2 py-1 rounded"
                    title="Sao chép tóm tắt"
                  >
                    {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSummary ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                )}
              </div>

              {localSummary ? (
                <div className="bg-slate-950/60 p-3 rounded-xl text-xs text-slate-300 leading-normal border border-indigo-500/10 whitespace-pre-wrap animate-in fade-in duration-300">
                  {localSummary}
                </div>
              ) : (
                <div className="bg-slate-950/20 border border-dashed border-slate-750 p-4 rounded-xl text-center text-xs text-slate-500">
                  Chưa tạo tóm tắt ý chính. Nhấp nút bên dưới để phân tích súc tích.
                </div>
              )}

              <button
                onClick={handleGenerateSummary}
                disabled={loadingSummary}
                className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loadingSummary ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    Đang tóm tắt tài liệu...
                  </>
                ) : (
                   <>
                     <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                     {localSummary ? 'Cập nhật Tóm Tắt AI' : 'Tạo Tóm Tắt AI'}
                   </>
                )}
              </button>
            </div>

            {/* AI Checklist Items Block */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">📋 Checklist phân rã công việc</span>

              {localChecklist && localChecklist.length > 0 ? (
                <div className="bg-slate-950/60 p-3 rounded-xl space-y-1.5 border border-indigo-500/10 animate-in fade-in duration-300 max-h-[145px] overflow-y-auto pr-1">
                  {localChecklist.map((task, idx) => (
                    <label 
                      key={idx} 
                      className="flex items-start gap-2 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <input 
                        type="checkbox" 
                        checked={!!checkedItems[idx]}
                        onChange={() => toggleCheckedItem(idx)}
                        className="mt-0.5 accent-indigo-500 h-3.5 w-3.5 rounded border-slate-700 bg-slate-800 focus:ring-0"
                      />
                      <span className={`${checkedItems[idx] ? 'line-through text-slate-500' : ''}`}>
                        {task}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-950/20 border border-dashed border-slate-750 p-4 rounded-xl text-center text-xs text-slate-500">
                  Chưa trích xuất đầu việc. Nhấp nút dưới để chuyển hóa thành To-Do.
                </div>
              )}

              <button
                onClick={handleGenerateChecklist}
                disabled={loadingChecklist}
                className="w-full bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loadingChecklist ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    Đang bóc tách đầu việc...
                  </>
                ) : (
                   <>
                     <ListTodo className="w-3.5 h-3.5 text-indigo-400" />
                     {localChecklist.length > 0 ? 'Tái trích xuất Checklist' : 'Trích xuất Checklist AI'}
                   </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Attachments view section */}
        {fileCount > 0 && (
          <div className="mt-6 border-t border-slate-800 pt-5">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>📎</span>
              Tệp tài liệu đính kèm ({fileCount})
            </h3>
            
            <div id="detailFiles" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {note.files?.map((file, idx) => {
                const fileMeta = getFileGroup(file.type, file.name);
                const isImage = file.type.startsWith('image/');
                
                return (
                  <div 
                    key={idx} 
                    className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group hover:border-slate-700 transition-colors"
                  >
                    {/* Visual Preview for Images directly inside note details! */}
                    {isImage && (
                      <div className="h-44 bg-slate-950 overflow-hidden relative flex items-center justify-center border-b border-slate-800 bg-grid-pattern">
                        <img 
                          src={file.data} 
                          alt={file.name} 
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <div className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xl select-none">{fileMeta.icon}</span>
                        <div className="truncate">
                          <p className="font-bold text-slate-300 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formatBytes(file.size)}
                          </p>
                        </div>
                      </div>

                      <a
                        href={file.data}
                        download={file.name}
                        className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-400 rounded-xl transition-all cursor-pointer border border-slate-700/60"
                        title="Tải tệp tin về thiết bị"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
