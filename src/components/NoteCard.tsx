/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trash2, Edit3, Bell, Paperclip, Calendar, Pin, Check, Sparkles } from 'lucide-react';
import { Note } from '../types';
import { formatDate, getPriorityMetadata, getStatusMetadata } from '../utils';

interface NoteCardProps {
  key?: string;
  note: Note;
  onView: (note: Note) => void | Promise<void>;
  onEdit: (note: Note) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onTogglePin?: (id: string, e: React.MouseEvent) => void;
  onUpdateStatus?: (id: string, status: 'none' | 'todo' | 'doing' | 'done') => void;
}

export default function NoteCard({ note, onView, onEdit, onDelete, onTogglePin, onUpdateStatus }: NoteCardProps) {
  const metadata = getPriorityMetadata(note.priority);
  const statusMeta = getStatusMetadata(note.status);
  const fileCount = note.files?.length || 0;
  const hasAiSupport = !!(note.aiSummary || note.aiChecklist?.length);

  return (
    <div
      onClick={() => onView(note)}
      className={`rounded-2xl p-4 flex flex-col justify-between group cursor-pointer transition-all duration-150 border relative ${
        note.isPinned 
          ? 'bg-slate-800/35 border-indigo-500/25 shadow-lg shadow-indigo-950/5' 
          : 'bg-slate-850/20 hover:bg-slate-800/30 border-slate-800/80 hover:border-slate-750/70'
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="flex justify-between items-start gap-2.5 mb-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Soft dot for priority indicator - minimalist approach over big side borders */}
            <span className={`w-2 h-2 rounded-full shrink-0 ${metadata.dotColor}`} title={`Ưu tiên: ${metadata.label}`} />

            {/* Quick Toggle Status Checkbox if it is a task */}
            {note.status && note.status !== 'none' && onUpdateStatus && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextStatus = note.status === 'done' ? 'todo' : 'done';
                  onUpdateStatus(note.id, nextStatus);
                }}
                className="shrink-0 p-0.5 hover:bg-slate-850 rounded transition-colors cursor-pointer"
                title={note.status === 'done' ? 'Đánh dấu Chưa Hoàn Thành' : 'Đánh dấu Đã Hoàn Thành'}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  note.status === 'done' 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'border-slate-700 hover:border-slate-650 text-transparent'
                }`}>
                  <Check className="w-3 h-3 stroke-[3px]" />
                </div>
              </button>
            )}

            <h3 className="text-sm font-bold text-slate-100 group-hover:text-white transition-colors truncate">
              {note.title || 'Không có tiêu đề'}
            </h3>
          </div>
          
          <div className="flex items-center gap-0.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
            {/* Pin Trigger Button */}
            {onTogglePin && (
              <button
                onClick={(e) => onTogglePin(note.id, e)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  note.isPinned 
                    ? 'text-indigo-400 hover:text-indigo-300' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title={note.isPinned ? 'Bỏ ghim ghi nhớ' : 'Ghim ghi nhớ lên đầu'}
              >
                <Pin className={`w-3 h-3 ${note.isPinned ? 'fill-current rotate-45' : ''}`} />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(note);
              }}
              className="p-1 text-slate-500 hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
              title="Cập nhật"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id);
              }}
              className="p-1 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
              title="Xóa bỏ"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Note created date tag */}
        <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-2 font-mono">
          <span>{formatDate(note.created).split(' ')[1] || formatDate(note.created)}</span>
        </div>

        {/* Note content snippet */}
        <p className="text-slate-300/90 text-xs leading-relaxed line-clamp-2.5 mb-3 whitespace-pre-wrap">
          {note.content || <em className="text-slate-650 text-[11px]">Không có nội dung</em>}
        </p>

        {/* Tags visual list */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {note.tags.map((tag) => (
              <span key={tag} className="text-[9px] font-medium bg-slate-800/40 text-indigo-400/90 px-1.5 py-0.5 rounded-md border border-slate-800">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer statistics (Reminders and attachments) */}
      <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-slate-800/40 mt-auto text-[9px] font-semibold text-slate-400">
        {/* Priority Badge */}
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border ${metadata.badgeColor}`}>
          <span>{metadata.icon}</span>
          <span>{metadata.label}</span>
        </span>

        {/* Task status Badge */}
        {note.status && note.status !== 'none' && (
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border ${statusMeta.badgeColor}`}>
            <span>{statusMeta.icon}</span>
            <span>{statusMeta.label}</span>
          </span>
        )}

        {/* Quick indicator if note contains processed AI intelligence */}
        {hasAiSupport && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-500/5 text-indigo-400 border border-indigo-500/10" title="Đã có Trợ lý AI phân tích">
            <span>✨ AI</span>
          </span>
        )}

        {/* Alarm Time Badge */}
        {note.remindTime && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/5 text-amber-400 border border-amber-500/10">
            <Bell className="w-2.5 h-2.5 text-amber-400" />
            <span>
              {new Date(note.remindTime).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </span>
        )}

        {/* Attachment badge */}
        {fileCount > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 ml-auto" title={`${fileCount} tệp đính kèm`}>
            <Paperclip className="w-2.5 h-2.5 text-indigo-400" />
            <span>{fileCount}</span>
          </span>
        )}
      </div>
    </div>
  );
}
