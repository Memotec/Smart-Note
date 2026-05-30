/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Bell, ShieldAlert, Paperclip, Upload, RefreshCw, Trash2, ChevronRight, Sparkles, Loader2, Bookmark, CheckSquare, HardDrive, ExternalLink, Bold, Italic, Heading3, List, ListTodo, Quote, Code, Eye, EyeOff, FileText, Palette, Mic, MicOff } from 'lucide-react';
import { Note, Attachment, Priority, NoteStatus } from '../types';
import { fileToBase64, formatBytes, getFileGroup, NOTE_COLORS, getNoteColorMetadata } from '../utils';
import GDriveBrowserModal from './GDriveBrowserModal';

interface NoteEditorModalProps {
  note: Note | null; // Null if creating a new note
  onClose: () => void;
  onSave: (noteData: Omit<Note, 'id' | 'created'> & { id?: string }) => void;
  isOpen: boolean;
  gdriveToken: string | null;
  onLoginDrive?: () => Promise<void>;
}

export default function NoteEditorModal({ note, onClose, onSave, isOpen, gdriveToken, onLoginDrive }: NoteEditorModalProps) {
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
  const [isGDriveBrowserOpen, setIsGDriveBrowserOpen] = useState(false);
  const [color, setColor] = useState('default');
  
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [hasDraft, setHasDraft] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const popularTags = ['Công việc', 'Học tập', 'Cá nhân', 'Ý tưởng', 'Tài liệu', 'Dự án', 'Kế hoạch'];

  // Voice dictation states
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Meeting recording & minutes states
  const [isRecordingMeeting, setIsRecordingMeeting] = useState(false);
  const [meetingTranscript, setMeetingTranscript] = useState('');
  const [isGeneratingMinutes, setIsGeneratingMinutes] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isMeetingExpanded, setIsMeetingExpanded] = useState(false); // Controls displaying the expanded meeting box
  const timerRef = useRef<any>(null);
  const meetingRecognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
    }
  }, []);

  // Check if draft exists on open for new notes
  useEffect(() => {
    if (isOpen && !note) {
      const draft = localStorage.getItem('smart_notes_draft_v1');
      if (draft) {
        setHasDraft(true);
      } else {
        setHasDraft(false);
      }
    } else {
      setHasDraft(false);
    }
  }, [isOpen, note]);

  // Save draft as user edits (only for new notes)
  useEffect(() => {
    if (isOpen && !note) {
      if (title.trim() || content.trim() || tags.length > 0 || priority !== 'low' || status !== 'none' || remindTime || attachments.length > 0 || color !== 'default') {
        const draftObj = {
          title,
          content,
          priority,
          status,
          tags,
          remindTime,
          remindBefore,
          attachments,
          color,
        };
        localStorage.setItem('smart_notes_draft_v1', JSON.stringify(draftObj));
      }
    }
  }, [title, content, priority, status, tags, remindTime, remindBefore, attachments, color, isOpen, note]);

  const handleRestoreDraft = () => {
    try {
      const draft = localStorage.getItem('smart_notes_draft_v1');
      if (draft) {
        const draftObj = JSON.parse(draft);
        setTitle(draftObj.title || '');
        setContent(draftObj.content || '');
        setPriority(draftObj.priority || 'low');
        setStatus(draftObj.status || 'none');
        setTags(draftObj.tags || []);
        setRemindTime(draftObj.remindTime || '');
        setRemindBefore(draftObj.remindBefore || '0');
        setAttachments(draftObj.attachments || []);
        setColor(draftObj.color || 'default');
        setHasDraft(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem('smart_notes_draft_v1');
    setHasDraft(false);
  };

  const handleTogglePopularTag = (popTag: string) => {
    if (tags.includes(popTag)) {
      setTags(tags.filter(t => t !== popTag));
    } else {
      setTags([...tags, popTag]);
    }
  };

  const insertMarkdown = (syntax: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const selected = text.substring(start, end);

    let replacement = '';
    if (syntax === 'bold') {
      replacement = `**${selected || 'văn_bản_đậm'}**`;
    } else if (syntax === 'italic') {
      replacement = `*${selected || 'chữ_nghiêng'}*`;
    } else if (syntax === 'code') {
      replacement = `\`${selected || 'mã_code'}\``;
    } else if (syntax === 'header') {
      replacement = `\n### ${selected || 'Tiêu đề'}\n`;
    } else if (syntax === 'list') {
      replacement = `\n- ${selected || 'Mục danh sách'}`;
    } else if (syntax === 'todo') {
      replacement = `\n- [ ] ${selected || 'Nhiệm vụ cần làm'}`;
    } else if (syntax === 'quote') {
      replacement = `\n> ${selected || 'Trích dẫn'}`;
    }

    const newContent = before + replacement + after;
    setContent(newContent);

    // Reposition cursor after update
    setTimeout(() => {
      textarea.focus();
      const newPos = start + replacement.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const toggleListening = () => {
    if (!voiceSupported) {
      alert("Trình duyệt của bạn hiện chưa hỗ trợ nhận diện giọng nói. Hãy dùng trình duyệt Google Chrome để trải nghiệm chức năng ghi âm.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch(e) {
          console.error(e);
        }
      }
      setIsListening(false);
    } else {
      setSpeechError(null);
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false; // We only care about finalized sentences for typing directly
        rec.lang = 'vi-VN'; // Set Vietnamese language by default for typing notes

        rec.onstart = () => {
          setIsListening(true);
          setSpeechError(null);
        };

        rec.onerror = (event: any) => {
          console.error("Speech Recognition Error:", event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setSpeechError("Không thể truy cập Microphone. Vui lòng cấp quyền Microphone cho trang web trong cài đặt trình duyệt của bạn.");
          } else if (event.error === 'no-speech') {
            setSpeechError("Không nghe thấy giọng nói nào. Hãy thử lại!");
          } else {
            setSpeechError(`Lỗi nhận diện giọng nói: ${event.error}`);
          }
        };

        rec.onend = () => {
          setIsListening(false);
        };

        rec.onresult = (event: any) => {
          let chunk = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              chunk += event.results[i][0].transcript;
            }
          }
          if (chunk) {
            setContent((prev) => {
              const cleanedPrev = prev.trim();
              const spacer = cleanedPrev ? (prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' ') : '';
              return prev + spacer + chunk;
            });
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err: any) {
        console.error("Critical error starting speech recognition:", err);
        setSpeechError("Có lỗi xảy ra khi chuẩn bị máy ghi âm giọng nói.");
        setIsListening(false);
      }
    }
  };

  // Helper function to format recording duration (e.g., 01:23)
  const formatRecordingTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMeetingRecording = () => {
    if (!voiceSupported) {
      alert("Trình duyệt của bạn hiện chưa hỗ trợ nhận diện giọng nói. Hãy dùng trình duyệt Google Chrome để trải nghiệm chức năng ghi âm.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (isRecordingMeeting) {
      if (meetingRecognitionRef.current) {
        try {
          meetingRecognitionRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      setIsRecordingMeeting(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else {
      setSpeechError(null);
      setRecordingSeconds(0);
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'vi-VN';

        rec.onstart = () => {
          setIsRecordingMeeting(true);
          setSpeechError(null);
          timerRef.current = setInterval(() => {
            setRecordingSeconds((prev) => prev + 1);
          }, 1000);
        };

        rec.onerror = (event: any) => {
          console.error("Meeting Speech Error:", event.error);
          setIsRecordingMeeting(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (event.error === 'not-allowed') {
            setSpeechError("Không thể truy cập Microphone. Vui lòng cấp quyền Microphone cho trình duyệt.");
          } else if (event.error === 'no-speech') {
            setSpeechError("Không phát hiện âm thanh/giọng nói thảo luận nào.");
          } else {
            setSpeechError(`Lỗi ghi âm cuộc họp: ${event.error}`);
          }
        };

        rec.onend = () => {
          setIsRecordingMeeting(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        };

        rec.onresult = (event: any) => {
          let chunks = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              chunks += event.results[i][0].transcript;
            }
          }
          if (chunks) {
            setMeetingTranscript((prev) => {
              const cleanedPrev = prev.trim();
              
              // Get current clock time to stamp
              const now = new Date();
              const stamp = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}]: `;
              
              return cleanedPrev 
                ? prev + '\n' + stamp + chunks 
                : stamp + chunks;
            });
          }
        };

        meetingRecognitionRef.current = rec;
        rec.start();
      } catch (err: any) {
        console.error("Error starting meeting recorder:", err);
        setSpeechError("Không thể kích hoạt bộ thu âm cuộc họp.");
        setIsRecordingMeeting(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }
  };

  const handleGenerateMeetingMinutes = async () => {
    const textToSummarize = meetingTranscript.trim() || content.trim();
    if (!textToSummarize) {
      alert("Vui lòng ghi âm cuộc họp hoặc gõ nội dung thảo luận thô vào ô nhập liệu trước khi chuyển đổi sang biên bản chuẩn form.");
      return;
    }

    setIsGeneratingMinutes(true);
    setSpeechError(null);

    try {
      const response = await fetch('/api/ai/meeting-minutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || 'Biên bản cuộc họp thô',
          content: textToSummarize,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Thất bại khi soạn biên bản họp qua AI');
      }

      const data = await response.json();
      if (data.minutes) {
        setContent(data.minutes);
        setActiveTab('preview'); // Open preview tab to show the beautiful output immediately
        if (data.suggestedTitle) {
          setTitle(data.suggestedTitle);
        }
        if (data.suggestedTags && Array.isArray(data.suggestedTags)) {
          const defaultMinutesTags = ['BienBanHop', 'CuocHop'];
          const unionTags = Array.from(new Set([...tags, ...defaultMinutesTags, ...data.suggestedTags]));
          setTags(unionTags);
        }
        setPriority('medium');
        setStatus('todo');
        // Close meeting record section nicely or reset it
        setIsMeetingExpanded(false);
      }
    } catch (err: any) {
      console.error(err);
      setSpeechError(err.message || 'Hệ thống AI bận tóm tắt biên bản họp. Vui lòng gửi lại yêu cầu.');
    } finally {
      setIsGeneratingMinutes(false);
    }
  };

  // Force stop all active recorders if modal is hidden
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // silent fallback
        }
        setIsListening(false);
      }
      if (meetingRecognitionRef.current) {
        try {
          meetingRecognitionRef.current.stop();
        } catch (e) {
          // silent fallback
        }
        setIsRecordingMeeting(false);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isOpen]);

  function parseMarkdownToHtml(md: string): string {
    if (!md) return '<em class="text-slate-500 text-xs">Chưa có nội dung soạn thảo để xem thử.</em>';
    // Escape standard characters simple and clean
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-white mt-3 mb-1 border-b border-slate-800 pb-1">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-white mt-4 mb-2 border-b border-slate-800 pb-1">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-black text-white mt-5 mb-2">$1</h1>');
    
    // Checklist item (todo)
    html = html.replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center gap-2 text-slate-300 my-1"><input type="checkbox" disabled class="accent-indigo-500 rounded" /> <span>$1</span></div>');
    html = html.replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center gap-2 text-slate-500 my-1"><input type="checkbox" disabled checked class="accent-indigo-500 rounded" /> <span class="line-through">$1</span></div>');
    
    // Bullet lists
    html = html.replace(/^- (.*$)/gim, '<li class="list-disc list-inside text-slate-300 ml-2 my-0.5">$1</li>');
    
    // Code block and inline code
    html = html.replace(/```([\s\S]*?)```/gm, '<pre class="bg-slate-900 border border-slate-800 p-2.5 rounded-lg font-mono text-xs text-indigo-300 overflow-x-auto my-2">$1</pre>');
    html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-xs text-indigo-300">$1</code>');
    
    // Blockquote
    html = html.replace(/^&gt; (.*$)/gim, '<blockquote class="border-l-4 border-indigo-500 pl-3 italic text-slate-400 my-2">$1</blockquote>');
    
    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-extrabold text-white">$1</strong>');
    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-200">$1</em>');
    
    // Newlines to br
    html = html.split('\n').join('<br />');
    
    return html;
  }

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
      setColor(note.color || 'default');
    } else {
      handleClear();
    }
  }, [note, isOpen]);

  const handleSelectDriveFile = (driveFile: any) => {
    const isAlreadyAttached = attachments.some(att => att.driveFileId === driveFile.id);
    if (isAlreadyAttached) {
      alert('Tài liệu Google Drive này đã được đính kèm vào ghi chú.');
      return;
    }

    const driveAttachment: Attachment = {
      name: driveFile.name,
      type: driveFile.mimeType,
      size: driveFile.size ? parseInt(driveFile.size) : 0,
      data: '', // Not keeping base64 for drive files
      driveFileId: driveFile.id,
      webViewLink: driveFile.webViewLink,
    };
    setAttachments((prev) => [...prev, driveAttachment]);
    setIsGDriveBrowserOpen(false);
  };

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
    setColor('default');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    handleClearDraft();
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
      color,
    });
    handleClearDraft();
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
          {hasDraft && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 sm:p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in slide-in-from-top-4">
              <div className="flex gap-2.5 items-start">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-xs font-bold text-amber-300">Phát hiện bản nháp chưa lưu gần nhất</p>
                  <p className="text-[10px] text-slate-450 leading-relaxed">Bạn đã soạn thảo dở dang một ghi chú trước đó nhưng chưa chọn lưu lại.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-md select-none"
                >
                  Khôi phục
                </button>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-350 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer select-none"
                >
                  Xóa nháp
                </button>
              </div>
            </div>
          )}

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
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Nội dung chi tiết
              </label>

              {/* Edit / Preview Tabs */}
              <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-[10px] sm:text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`px-2.5 py-1 rounded transition-all font-bold cursor-pointer select-none ${
                    activeTab === 'write' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Soạn thảo
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-2.5 py-1 rounded transition-all font-bold cursor-pointer select-none ${
                    activeTab === 'preview' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    Xem trước
                  </span>
                </button>
              </div>
            </div>

            {activeTab === 'write' ? (
              <div className="space-y-2">
                {/* Formatting action bar */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => insertMarkdown('bold')}
                    className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 select-none"
                    title="In đậm (Bold)"
                  >
                    <Bold className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('italic')}
                    className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 select-none"
                    title="In nghiêng (Italic)"
                  >
                    <Italic className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('header')}
                    className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 select-none font-bold"
                    title="Tiêu đề (Header)"
                  >
                    <Heading3 className="w-3.5 h-3.5 text-indigo-300" />
                  </button>
                  <span className="h-4 w-[1px] bg-slate-800 mx-1"></span>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('list')}
                    className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 select-none"
                    title="Danh sách (Bullet List)"
                  >
                    <List className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('todo')}
                    className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 select-none"
                    title="Danh sách việc (To-Do List)"
                  >
                    <ListTodo className="w-3.5 h-3.5 text-sky-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('quote')}
                    className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 select-none"
                    title="Trích dẫn (Quote)"
                  >
                    <Quote className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('code')}
                    className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 select-none"
                    title="Khối mã (Code block)"
                  >
                    <Code className="w-3.5 h-3.5 text-amber-400" />
                  </button>

                  <span className="h-4 w-[1px] bg-slate-800 mx-1"></span>

                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5 select-none font-semibold ${
                      isListening
                        ? 'bg-rose-500/25 text-rose-300 border border-rose-500/35 shadow-md flex shrink-0 animate-pulse'
                        : 'hover:bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                    title={isListening ? "Dừng ghi âm giọng nói" : "Gõ văn bản bằng giọng nói (Dictate Speech-to-Text)"}
                  >
                    {isListening ? (
                      <>
                        <Mic className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                        <span className="text-[10px] text-rose-300 font-bold font-mono">Dừng ghi...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] text-slate-400 hover:text-slate-200">Giọng nói</span>
                      </>
                    )}
                  </button>
                </div>

                {speechError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-305 text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-in slide-in-from-top-1">
                    <span className="w-1.5 h-1.5 bg-rose-550 rounded-full shrink-0"></span>
                    <p className="font-semibold leading-normal text-rose-300">{speechError}</p>
                  </div>
                )}

                {isListening && !speechError && (
                  <div className="bg-indigo-950/40 border border-indigo-500/20 text-indigo-305 text-[10px] px-3 py-2 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-1 font-mono">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                    <p className="leading-snug text-indigo-300">
                      Hệ thống đang lắng nghe... Hãy nói Tiếng Việt để dịch trực tiếp vào nội dung ghi chú.
                    </p>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    id="content"
                    ref={textareaRef}
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Nhập nội dung ghi chú ở đây... Bạn có thể sử dụng cú pháp Markdown để định dạng và tô điểm sinh động văn bản."
                    className="w-full bg-slate-850 text-slate-100 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700/60 text-sm sm:text-base placeholder-slate-500 min-h-[160px] font-sans"
                    required
                  ></textarea>
                </div>

                {/* Counters block */}
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-1">
                  <p className="text-slate-600">Đầu ra lưu dưới dữ liệu văn bản hoặc cấu trúc Markdown</p>
                  <div className="flex gap-3">
                    <span>Ký tự: {content.length}</span>
                    <span>•</span>
                    <span>Từ: {content.trim() ? content.trim().split(/\s+/).length : 0}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="w-full bg-slate-850/85 rounded-xl px-4 py-4 border border-slate-700 min-h-[220px] max-h-[350px] overflow-y-auto text-sm"
              >
                <div 
                  className="prose prose-invert max-w-none text-slate-200 markdown-body"
                  dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(content) }}
                />
              </div>
            )}
          </div>

          {/* Virtual Secretary & Meeting Minutes Generator Board */}
          <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900/60 border border-indigo-500/30 rounded-2xl p-4.5 sm:p-5 shadow-inner">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-3 items-center">
                <div className={`p-2.5 rounded-xl transition-all ${isRecordingMeeting ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-indigo-300 flex items-center gap-1.5 font-sans">
                    🎙️ GHI ÂM & TẠO BIÊN BẢN HỌP (AI)
                    {isRecordingMeeting && (
                      <span className="flex h-2 w-2 relative shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] sm:text-xs text-slate-400 leading-normal">Ghi lý thuyết, thảo luận cuộc họp trực tiếp để tự động soạn biên bản chuẩn hóa Việt Nam.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMeetingExpanded(!isMeetingExpanded)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0"
              >
                {isMeetingExpanded ? 'Thu gọn' : 'Bắt đầu'}
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isMeetingExpanded ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {isMeetingExpanded && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 animate-in slide-in-from-top-2 duration-200 text-left">
                {/* Recording interface panel */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-850 justify-between">
                  {/* Status indicator / Wave animation */}
                  <div className="flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={toggleMeetingRecording}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg transform active:scale-95 ${
                        isRecordingMeeting
                          ? 'bg-rose-600 hover:bg-rose-500 text-white ring-4 ring-rose-500/20'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white ring-4 ring-indigo-500/10'
                      }`}
                      title={isRecordingMeeting ? "Dừng ghi âm" : "Bắt đầu thu âm cuộc họp"}
                    >
                      {isRecordingMeeting ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>

                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-200 font-sans">
                        {isRecordingMeeting ? 'Đang thu âm phát biểu...' : 'Thiết bị ghi nhận sẵn sàng'}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">
                        {isRecordingMeeting ? `Thời lượng: ${formatRecordingTime(recordingSeconds)}` : 'Nhấp nút biểu tượng mic để bắt đầu đối thoại'}
                      </p>
                    </div>
                  </div>

                  {/* Soundwave animation */}
                  {isRecordingMeeting ? (
                    <div className="flex items-center gap-1 h-5 px-3">
                      <span className="w-[3px] bg-indigo-400 rounded-full h-3 animate-pulse"></span>
                      <span className="w-[3px] bg-purple-400 rounded-full h-5 animate-ping duration-75"></span>
                      <span className="w-[3px] bg-pink-400 rounded-full h-2 animate-pulse"></span>
                      <span className="w-[3px] bg-red-400 rounded-full h-4 animate-bounce"></span>
                      <span className="w-[3px] bg-indigo-500 rounded-full h-3 animate-pulse"></span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 font-mono italic">
                      Mic đang chờ...
                    </div>
                  )}
                </div>

                {/* Live Output Log Area */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <span>📝</span> Nhật ký phát biểu (Transcript Timeline):
                    </span>
                    {meetingTranscript && (
                      <button
                        type="button"
                        onClick={() => { if(confirm('Bạn có chắc muốn xóa bản ghi thảo luận hiện tại?')) setMeetingTranscript(''); }}
                        className="text-[10px] text-rose-450 hover:text-rose-400 font-bold transition-all cursor-pointer"
                      >
                        Xóa bản ghi thảo luận
                      </button>
                    )}
                  </div>
                  
                  <textarea
                    value={meetingTranscript}
                    onChange={(e) => setMeetingTranscript(e.target.value)}
                    placeholder="Chưa có thông tin ghi nhận. Hãy thảo luận để hệ thống tự phân mốc thời gian chi tiết. Bạn cũng có thể viết hoặc dán nội dung thảo luận thô vào đây."
                    className="w-full bg-slate-950 text-emerald-400 font-mono text-xs p-3.5 rounded-xl border border-slate-800/80 min-h-[110px] max-h-[220px] focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-700 leading-relaxed"
                  />
                </div>

                {/* Actions & Warnings */}
                {speechError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] px-3.5 py-2.5 rounded-xl font-semibold leading-relaxed">
                    ⚠️ {speechError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3.5 items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-850/80">
                  <div className="text-[10.5px] text-slate-500 leading-normal max-w-sm text-left">
                    💡 <span className="font-bold text-slate-400">Gợi ý thao tác:</span> Nhấn nút bên phải để trợ lý Gemini tự động tổng hợp thông tin, thiết lập sơ đồ chữ ký và tạo Biên bản cuộc họp chuẩn chỉnh theo form Doanh nghiệp.
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateMeetingMinutes}
                    disabled={isGeneratingMinutes || (!meetingTranscript.trim() && !content.trim())}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-550 disabled:bg-slate-850 text-white font-bold text-xs px-4.5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 select-none cursor-pointer shadow-md disabled:text-slate-600"
                  >
                    {isGeneratingMinutes ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        Đang soạn Biên bản chuẩn form...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                        Tạo Biên Bản Chuẩn Form (AI)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
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

          {/* Note Color Theme Selection Row */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-sans">
              <Palette className="w-4 h-4 text-indigo-400" />
              Màu sắc hiển thị (Chủ đề)
            </label>
            <div className="bg-slate-850 rounded-xl p-3 sm:p-4 border border-slate-705/65 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2.5">
                {NOTE_COLORS.map((preset) => {
                  const isSelected = color === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setColor(preset.id)}
                      className={`relative w-8 h-8 rounded-full cursor-pointer transition-all duration-150 transform hover:scale-110 active:scale-95 flex items-center justify-center border-2 ${
                        isSelected 
                          ? 'border-indigo-400 ring-2 ring-indigo-500/30 ring-offset-2 ring-offset-slate-900' 
                          : 'border-slate-800 hover:border-slate-650'
                      }`}
                      style={{ backgroundColor: preset.bgHexColors }}
                      title={preset.label}
                    />
                  );
                })}
              </div>
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 font-mono">
                <span className="text-indigo-400">⚡</span>
                Chủ đề đang chọn: <span className="font-bold text-slate-200">{getNoteColorMetadata(color).label}</span>
              </div>
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

              {/* Popular Suggested Tags */}
              <div className="mt-2.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <span>💡</span> Gợi ý nhãn nhanh:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {popularTags.map((popTag) => {
                    const isSelected = tags.includes(popTag);
                    return (
                      <button
                        key={popTag}
                        type="button"
                        onClick={() => handleTogglePopularTag(popTag)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-all select-none border ${
                          isSelected
                            ? 'bg-indigo-650/30 border-indigo-500 text-indigo-300'
                            : 'bg-slate-900/40 border-slate-750 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}#{popTag}
                      </button>
                    );
                  })}
                </div>
              </div>
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
                Nhấp vào đây hoặc kéo thả tập tin để tải lên thiết bị cục bộ
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Hỗ trợ Hình ảnh, PDF, Word, Excel (Ảnh hoặc Tài liệu tối đa 5MB)
              </p>
            </div>

            {/* Google Drive Attachments Switch */}
            <div className="mt-2.5 flex items-center justify-between p-3 bg-slate-900/40 border border-slate-800 rounded-xl gap-2 text-xs">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-400 animate-pulse" />
                <div className="text-left">
                  <p className="text-slate-300 font-bold font-sans">
                    {gdriveToken ? "Đã liên kết Google Drive" : "Sử dụng Cloud Google Drive"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {gdriveToken ? "Chọn tài liệu từ Google Drive của bạn" : "Đăng nhập Google để đính kèm tài liệu dung lượng lớn"}
                  </p>
                </div>
              </div>
              {gdriveToken ? (
                <button
                  type="button"
                  onClick={() => setIsGDriveBrowserOpen(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-550 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs"
                >
                  Chọn tệp Drive
                </button>
              ) : onLoginDrive ? (
                <button
                  type="button"
                  onClick={onLoginDrive}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 rounded-lg font-semibold transition-colors cursor-pointer text-xs"
                >
                  Kết nối Google Drive
                </button>
              ) : null}
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
                          <p className="text-[10px] text-slate-500 flex items-center gap-1.5 leading-none mt-1">
                            <span>{fileMeta.label}</span>
                            <span>•</span>
                            <span>{formatBytes(file.size)}</span>
                            {file.driveFileId && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                                Google Drive
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-lg transition-all"
                            title="Mở tài liệu Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(idx)}
                          className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                          title="Xóa tệp đính kèm này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

        {/* Google Drive Browser Modal overlay */}
        <GDriveBrowserModal
          isOpen={isGDriveBrowserOpen}
          onClose={() => setIsGDriveBrowserOpen(false)}
          accessToken={gdriveToken}
          onSelectFile={handleSelectDriveFile}
        />
      </div>
    </div>
  );
}
