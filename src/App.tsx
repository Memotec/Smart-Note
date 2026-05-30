/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import NoteCard from './components/NoteCard';
import NoteEditorModal from './components/NoteEditorModal';
import NoteDetailModal from './components/NoteDetailModal';
import MobileBottomBar from './components/MobileBottomBar';
import { Note, SyncConfig, Priority } from './types';
import { formatDate } from './utils';
import { initAuth, googleSignIn, logout, getAccessToken } from './lib/firebaseAuth';
import { saveBackupToDrive, downloadDriveFile, findDriveBackupFile } from './utils/gdriveApi';
import { 
  Bell, 
  AlertCircle, 
  Sparkles, 
  Clock, 
  Trash2, 
  Wifi, 
  WifiOff, 
  Info, 
  Check, 
  TrendingUp, 
  CheckSquare, 
  Inbox, 
  ChevronRight, 
  Calendar,
  Layers,
  ArrowUp
} from 'lucide-react';

export default function App() {
  // State definitions
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const local = localStorage.getItem('smart_notes_data');
      return local ? JSON.parse(local) : [];
    } catch (e) {
      console.error('Error loading notes from localStorage:', e);
      return [];
    }
  });

  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => {
    try {
      const local = localStorage.getItem('smart_notes_sync_config');
      return local ? JSON.parse(local) : {
        apiUrl: 'https://script.google.com/macros/s/AKfycbwq2S6g-EZb917YbGcQA_cryeJIn4am0bco3WT6xJ0TzlZ7tsRlpwuMsJMw3VTPQUmh/exec',
        useSync: false,
      };
    } catch (e) {
      return {
        apiUrl: 'https://script.google.com/macros/s/AKfycbwq2S6g-EZb917YbGcQA_cryeJIn4am0bco3WT6xJ0TzlZ7tsRlpwuMsJMw3VTPQUmh/exec',
        useSync: false,
      };
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Google Drive Authentication states
  const [gdriveUser, setGdriveUser] = useState<any | null>(null);
  const [gdriveToken, setGdriveToken] = useState<string | null>(null);
  const [isBackingUpDrive, setIsBackingUpDrive] = useState(false);
  const [isRestoringDrive, setIsRestoringDrive] = useState(false);

  const DRIVE_BACKUP_FILENAME = 'notes_backup_cloud.json';

  // Modal control states
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);

  // Triggered alarm reminder banner state
  const [triggeredAlarmNote, setTriggeredAlarmNote] = useState<Note | null>(null);

  // PWA install event
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Keep track of notified notes to prevent double alerting
  const notifiedRef = useRef<Set<string>>(new Set());

  // Listen to network changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync / Listen to Firebase Google Drive Authentication state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGdriveUser(user);
        setGdriveToken(token);
      },
      () => {
        setGdriveUser(null);
        setGdriveToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Request notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Sync state to local storage whenever notes change
  useEffect(() => {
    localStorage.setItem('smart_notes_data', JSON.stringify(notes));
  }, [notes]);

  // Sync config to local storage
  useEffect(() => {
    localStorage.setItem('smart_notes_sync_config', JSON.stringify(syncConfig));
  }, [syncConfig]);

  // PWA installation prompt interceptor
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Automated loading of remote notes on mount if sync is active
  useEffect(() => {
    if (syncConfig.useSync) {
      loadNotesFromRemote();
    }
  }, [syncConfig.useSync, syncConfig.apiUrl]);

  // Periodic reminder scheduler
  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      notes.forEach((note) => {
        if (!note.remindTime) return;

        const remindTime = new Date(note.remindTime).getTime();
        const remindBefore = parseInt(note.remindBefore || '0', 10);
        const notifyAt = remindTime - remindBefore * 60 * 1000;
        const diff = notifyAt - now;

        // Alarm window criteria: within last 40 seconds to prevent skipping triggers
        if (diff <= 30000 && diff >= -10000 && !notifiedRef.current.has(note.id)) {
          notifiedRef.current.add(note.id);
          triggerReminder(note);
        }
      });
    };

    // Run verification immediately and continuously every 20 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 20000);
    return () => clearInterval(interval);
  }, [notes]);

  // Helper alarm synthesizer audio generator
  const playReminderChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio chime disabled', e);
    }
  };

  const triggerReminder = (note: Note) => {
    playReminderChime();

    // Standard push notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('⏰ SMART NOTES: NHẮC NHỞ LỊCH HẸN', {
          body: `${note.title}\n\n${note.content.substring(0, 100)}`,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.error('Error playing system push notifications', e);
      }
    }

    // Interactive internal alarm dialog
    setTriggeredAlarmNote(note);
  };

  // Google Apps Script network operations
  const loadNotesFromRemote = async () => {
    if (!syncConfig.useSync || !syncConfig.apiUrl) return;
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const response = await fetch(syncConfig.apiUrl);
      if (!response.ok) throw new Error('Không thể fetch dữ liệu từ Apps Script.');
      
      const remoteNotes = await response.json();
      if (Array.isArray(remoteNotes)) {
        // Safe mapping to preserve file fields if missing or custom format
        const formatted = remoteNotes.map((note: any) => ({
          id: String(note.id || ''),
          title: String(note.title || ''),
          content: String(note.content || ''),
          priority: (note.priority as Priority) || 'low',
          remindTime: String(note.remindTime || ''),
          remindBefore: String(note.remindBefore || '0'),
          created: String(note.created || new Date().toISOString()),
          files: Array.isArray(note.files) ? note.files : [],
        }));

        setNotes(formatted);
        showSuccess('Đã cập nhật đồng bộ tất cả ghi chú trực tuyến!');
      } else {
        throw new Error('Định dạng phản hồi không hợp lệ.');
      }
    } catch (err: any) {
      console.error('Remote Note Sync Error:', err);
      setErrorMessage(
        'Không thể kết nối với cloud. Ghi chú của bạn được lưu cục bộ trên thiết bị!'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const saveNoteToRemote = async (noteItem: Note, isEdit: boolean) => {
    if (!syncConfig.useSync || !syncConfig.apiUrl) return;

    try {
      const response = await fetch(syncConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: isEdit ? 'edit' : 'add',
          id: noteItem.id,
          title: noteItem.title,
          content: noteItem.content,
          priority: noteItem.priority,
          remindTime: noteItem.remindTime,
          remindBefore: noteItem.remindBefore,
          // Convert files to base64 block so they are sent upstream if target handler supports
          files: noteItem.files || [],
        }),
      });

      if (!response.ok) throw new Error('Cập nhật dữ liệu cloud thất bại');
      showSuccess(`Đã lưu và đồng bộ lên đám mây thành công!`);
    } catch (e) {
      console.error('Save Remote Error:', e);
      setErrorMessage('Lỗi đồng bộ lên cloud. Bản ghi tạm lưu trên máy.');
    }
  };

  const deleteNoteFromRemote = async (id: string) => {
    if (!syncConfig.useSync || !syncConfig.apiUrl) return;

    try {
      const response = await fetch(syncConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'delete',
          id: id,
        }),
      });

      if (!response.ok) throw new Error('Xóa dữ liệu cloud thất bại');
      showSuccess('Đã xóa vĩnh viễn trên đám mây!');
    } catch (e) {
      console.error('Delete Remote Error:', e);
      setErrorMessage('Lỗi xóa trên đám mây. Bản ghi tạm thời xóa cục bộ.');
    }
  };

  // Helper notification feedback panels
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Form note action operations
  const handleSaveNote = async (noteData: Omit<Note, 'id' | 'created'> & { id?: string }) => {
    const isEdit = !!noteData.id;
    const nowStr = new Date().toISOString();
    
    let updatedNote: Note;

    if (isEdit) {
      // Find current note in our index to preserve created date
      const original = notes.find(n => n.id === noteData.id);
      updatedNote = {
        id: noteData.id!,
        title: noteData.title,
        content: noteData.content,
        priority: noteData.priority,
        status: noteData.status || 'none',
        tags: noteData.tags || [],
        isPinned: original ? original.isPinned : false,
        aiSummary: original ? original.aiSummary : '',
        aiChecklist: original ? original.aiChecklist : [],
        remindTime: noteData.remindTime,
        remindBefore: noteData.remindBefore,
        created: original ? original.created : nowStr,
        files: noteData.files || [],
      };

      setNotes((prev) => prev.map((n) => (n.id === noteData.id ? updatedNote : n)));
      showSuccess('Ghi chú đã được cập nhật thành công!');
    } else {
      updatedNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: noteData.title,
        content: noteData.content,
        priority: noteData.priority,
        status: noteData.status || 'none',
        tags: noteData.tags || [],
        isPinned: false,
        aiSummary: '',
        aiChecklist: [],
        remindTime: noteData.remindTime,
        remindBefore: noteData.remindBefore,
        created: nowStr,
        files: noteData.files || [],
      };

      setNotes((prev) => [updatedNote, ...prev]);
      showSuccess('Thêm ghi chú mới thành công!');
    }

    // Always push to remote asynchronously
    if (syncConfig.useSync) {
      await saveNoteToRemote(updatedNote, isEdit);
    }
  };

  const handleTogglePin = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const original = notes.find((n) => n.id === id);
    if (!original) return;
    const updatedNote: Note = {
      ...original,
      isPinned: !original.isPinned
    };
    setNotes((prev) => prev.map((n) => (n.id === id ? updatedNote : n)));
    showSuccess(updatedNote.isPinned ? '📌 Đã ghim ghi nhớ thành công!' : '📌 Đã hủy ghim ghi nhớ.');

    if (syncConfig.useSync) {
      await saveNoteToRemote(updatedNote, true);
    }
  };

  const handleUpdateNote = async (id: string, partial: Partial<Note>) => {
    const original = notes.find((n) => n.id === id);
    if (!original) return;
    const updatedNote: Note = {
      ...original,
      ...partial
    };
    setNotes((prev) => prev.map((n) => (n.id === id ? updatedNote : n)));
    if (selectedNote && selectedNote.id === id) {
      setSelectedNote(updatedNote);
    }
    if (syncConfig.useSync) {
      await saveNoteToRemote(updatedNote, true);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ghi chú này không? Thao tác không thể khôi phục.')) return;

    // Locally exclude immediately for beautiful UX latency compensation
    setNotes((prev) => prev.filter((n) => n.id !== id));
    // Remove if stored in alarmed queue
    notifiedRef.current.delete(id);

    // Sync deletion to cloud
    if (syncConfig.useSync) {
      await deleteNoteFromRemote(id);
    } else {
      showSuccess('Ghi chú đã được loại bỏ thành công!');
    }
  };

  const handleEditTrigger = (noteItem: Note) => {
    setNoteToEdit(noteItem);
    setEditorOpen(true);
  };

  const handleCreateTrigger = () => {
    setNoteToEdit(null);
    setEditorOpen(true);
  };

  const handleViewTrigger = (noteItem: Note) => {
    setSelectedNote(noteItem);
    setDetailOpen(true);
  };

  const handleManualRefresh = async () => {
    if (syncConfig.useSync) {
      await loadNotesFromRemote();
    } else {
      setIsRefreshing(true);
      setTimeout(() => {
        setIsRefreshing(false);
        showSuccess('Máy chủ offline: Làm mới vùng nhớ cục bộ thành công!');
      }, 700);
    }
  };

  const handleUpdateSyncConfig = (newConfig: SyncConfig) => {
    setSyncConfig(newConfig);
    if (!newConfig.useSync) {
      setErrorMessage(null);
      showSuccess('Đã chuyển sang chế độ Làm việc Ngoại tuyến (Local Only).');
    }
  };

  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(notes, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smart_notes_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess('Đã xuất toàn bộ ghi chú thành tệp dữ liệu JSON thành công!');
    } catch (err) {
      console.error('Export error:', err);
      setErrorMessage('Không thể xuất dữ liệu ghi chú.');
    }
  };

  const handleLoginDrive = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGdriveUser(result.user);
        setGdriveToken(result.accessToken);
        showSuccess('Đã kết nối tài khoản Google Drive thành công!');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Kết nối thất bại. Lỗi: ' + (err.message || 'Unknown'));
    }
  };

  const handleLogoutDrive = async () => {
    try {
      await logout();
      setGdriveUser(null);
      setGdriveToken(null);
      showSuccess('Đã ngắt kết nối tài khoản Google Drive.');
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Không thể đăng xuất hoàn toàn.');
    }
  };

  const handleBackupDrive = async () => {
    if (!gdriveToken) {
      setErrorMessage('Bạn chưa đăng nhập Google Drive.');
      return;
    }
    setIsBackingUpDrive(true);
    setErrorMessage(null);
    try {
      const dataStr = JSON.stringify(notes, null, 2);
      await saveBackupToDrive(gdriveToken, DRIVE_BACKUP_FILENAME, dataStr);
      showSuccess('Đã sao lưu toàn bộ ghi chú lên Google Drive cá nhân thành công!');
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Không thể sao lưu lên Google Drive: ' + (err.message || err));
    } finally {
      setIsBackingUpDrive(false);
    }
  };

  const handleRestoreDrive = async (strategy: 'overwrite' | 'merge') => {
    if (!gdriveToken) {
      setErrorMessage('Bạn chưa đăng nhập Google Drive.');
      return;
    }
    setIsRestoringDrive(true);
    setErrorMessage(null);
    try {
      const backupFileId = await findDriveBackupFile(gdriveToken, DRIVE_BACKUP_FILENAME);
      if (!backupFileId) {
        setErrorMessage('Không tìm thấy tệp sao lưu "notes_backup_cloud.json" nào trên tài khoản Google Drive của bạn.');
        return;
      }
      const jsonText = await downloadDriveFile(gdriveToken, backupFileId);
      handleImportJSON(jsonText, strategy);
      showSuccess('Đã khôi phục ghi chú từ Google Drive thành công!');
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Lỗi khôi phục từ Google Drive: ' + (err.message || err));
    } finally {
      setIsRestoringDrive(false);
    }
  };

  const handleImportJSON = (jsonText: string, strategy: 'overwrite' | 'merge') => {
    try {
      if (!jsonText.trim()) {
        throw new Error('Tệp trống rỗng, vui lòng chọn một tệp hợp lệ.');
      }
      
      const importedData = JSON.parse(jsonText);
      if (!Array.isArray(importedData)) {
        throw new Error('Cấu trúc dữ liệu khôi phục không hợp lệ. Bản sao lưu phải là một danh sách ghi chú.');
      }
      
      const validatedNotes: Note[] = [];
      for (const item of importedData) {
        if (!item || typeof item !== 'object') continue;
        
        const id = item.id ? String(item.id) : `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const title = item.title ? String(item.title) : 'Không có tiêu đề';
        const content = item.content ? String(item.content) : '';
        const priority = ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'low';
        const status = ['none', 'todo', 'doing', 'done'].includes(item.status) ? item.status : 'none';
        const isPinned = !!item.isPinned;
        const tags = Array.isArray(item.tags) ? item.tags.map((t: any) => String(t)) : [];
        const remindTime = item.remindTime ? String(item.remindTime) : '';
        const remindBefore = item.remindBefore ? String(item.remindBefore) : '0';
        const created = item.created ? String(item.created) : new Date().toISOString();
        const files = Array.isArray(item.files) ? item.files : [];
        const aiSummary = item.aiSummary ? String(item.aiSummary) : undefined;
        const aiChecklist = Array.isArray(item.aiChecklist) ? item.aiChecklist.map((c: any) => String(c)) : undefined;

        validatedNotes.push({
          id,
          title,
          content,
          priority,
          status,
          isPinned,
          tags,
          remindTime,
          remindBefore,
          created,
          files,
          aiSummary,
          aiChecklist,
        });
      }

      if (validatedNotes.length === 0) {
        throw new Error('Không tìm thấy ghi chú hợp lệ nào trong tệp này.');
      }

      if (strategy === 'overwrite') {
        setNotes(validatedNotes);
        setErrorMessage(null);
        showSuccess(`Khôi phục thành công! Đã ghi đè ${validatedNotes.length} ghi chú.`);
      } else {
        setNotes((prev) => {
          const prevMap = new Map(prev.map(n => [n.id, n]));
          validatedNotes.forEach(n => {
            prevMap.set(n.id, n);
          });
          return Array.from(prevMap.values());
        });
        setErrorMessage(null);
        showSuccess(`Nhập dữ liệu thành công! Đã hợp nhất ${validatedNotes.length} ghi chú.`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Nhập bản sao lưu thất bại: ${err.message || 'Lỗi đọc tệp tin JSON.'}`);
    }
  };

  const handleInstallAppClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to simulated installation prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // Filtering list based on search term & priority categorization
  const filteredNotes = notes.filter((n) => {
    const keyword = searchQuery.toLowerCase();
    const matchesKeyword =
      n.title.toLowerCase().includes(keyword) || 
      n.content.toLowerCase().includes(keyword) ||
      (n.tags && n.tags.some((tag) => tag.toLowerCase().includes(keyword)));
    
    let matchesFilter = false;
    if (activeFilter === 'all') {
      matchesFilter = true;
    } else if (activeFilter === 'high' || activeFilter === 'medium' || activeFilter === 'low') {
      matchesFilter = n.priority === activeFilter;
    } else if (activeFilter === 'pinned') {
      matchesFilter = !!n.isPinned;
    } else {
      matchesFilter = n.status === activeFilter;
    }
    return matchesKeyword && matchesFilter;
  });

  // Sort notes so Pinned items float cleanly at the top of lists
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (aPinned !== bPinned) {
      return bPinned - aPinned;
    }
    return new Date(b.created).getTime() - new Date(a.created).getTime();
  });

  // Task Completion Metric calculations
  const totalTasks = notes.filter(n => n.status && n.status !== 'none').length;
  const completedTasks = notes.filter(n => n.status === 'done').length;
  const taskProgressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col pb-24 md:pb-6 relative selection:bg-indigo-600 selection:text-white">
      {/* Visual background lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[150px] pointer-events-none" />

      {/* Main Header Component */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenNewNote={handleCreateTrigger}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        syncConfig={syncConfig}
        onUpdateSyncConfig={handleUpdateSyncConfig}
        isOnline={isOnline}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        
        gdriveUser={gdriveUser}
        gdriveToken={gdriveToken}
        onLoginDrive={handleLoginDrive}
        onLogoutDrive={handleLogoutDrive}
        onBackupDrive={handleBackupDrive}
        onRestoreDrive={handleRestoreDrive}
        isBackingUpDrive={isBackingUpDrive}
        isRestoringDrive={isRestoringDrive}
      />

      <div className="max-w-7xl mx-auto px-4 sm:p-6 w-full flex-1">
        
        {/* Alerts / Sync warning display panel */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Nhắc nhở kết nối:</span> {errorMessage}
            </div>
            <button 
              onClick={() => setErrorMessage(null)}
              className="text-amber-400/60 hover:text-amber-300 font-bold ml-2 text-base select-none px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Global Success Banner Indicator */}
        {successMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-2xl bg-slate-950 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Performance & Minimalist Filters Block */}
        <div className="mb-5">
          <div className="flex flex-wrap gap-1.5 items-center bg-slate-900/40 p-1.5 rounded-xl border border-slate-800/80">
            {[
              { id: 'all', label: 'Tất cả Ghi chú', count: notes.length, activeBg: 'bg-indigo-600 text-white font-semibold' },
              { id: 'pinned', label: '📌 Đã ghim', count: notes.filter(n => !!n.isPinned).length, activeBg: 'bg-slate-800 text-indigo-400 border border-indigo-500/15' },
              { id: 'high', label: '🔴 Khẩn cấp', count: notes.filter(n => n.priority === 'high').length, activeBg: 'bg-red-500/10 text-red-400 border border-red-500/20' },
              { id: 'medium', label: '🟠 Quan trọng', count: notes.filter(n => n.priority === 'medium').length, activeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
              { id: 'low', label: '🟢 Bình thường', count: notes.filter(n => n.priority === 'low').length, activeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
              { id: 'todo', label: '⏳ To-Do', count: notes.filter(n => n.status === 'todo').length, activeBg: 'bg-sky-500/10 text-sky-450 border border-sky-500/15' },
              { id: 'doing', label: '⚡ Đang làm', count: notes.filter(n => n.status === 'doing').length, activeBg: 'bg-slate-805 text-amber-400 border border-amber-500/15' },
              { id: 'done', label: '✅ Đã xong', count: notes.filter(n => n.status === 'done').length, activeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
            ].map((filt) => {
              const isActive = activeFilter === filt.id;
              return (
                <button
                  key={filt.id}
                  onClick={() => setActiveFilter(filt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isActive 
                      ? filt.activeBg
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <span className="font-medium whitespace-nowrap">{filt.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono ${
                    isActive ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {filt.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Minimalist Performance Metrics StatusBar */}
        {notes.length > 0 && (
          <div className="mb-5 p-3 rounded-xl bg-slate-850/20 border border-slate-800/60 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>Tiến độ việc: <strong className="text-slate-200">{completedTasks}/{totalTasks}</strong></span>
                {totalTasks > 0 && (
                  <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden inline-block ml-1">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${taskProgressPct}%` }} />
                  </div>
                )}
                <span className="text-[10px] text-slate-500">{taskProgressPct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>AI: <strong className="text-slate-200">{notes.filter(n => n.aiSummary || n.aiChecklist?.length).length}</strong> phân tích</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Báo thức: <strong className="text-slate-200">{notes.filter(n => n.remindTime).length}</strong> lịch hẹn</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0">
              <span className="text-[10px] uppercase font-mono text-slate-500">Trạng thái hệ thống:</span>
              <div className="flex items-center gap-1 text-[10px] font-semibold">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="text-slate-300">{isOnline ? 'Đám mây kết nối' : 'Cục bộ tự đóng'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes Grid content view wrapper */}
        {sortedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-slate-850/40 border border-slate-800/80 rounded-3xl text-center shadow-xl max-w-lg mx-auto mt-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl mb-4 text-indigo-400 animate-pulse">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-200 mb-2">Không tìm thấy ghi chú nào</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              {searchQuery || activeFilter !== 'all'
                ? 'Không thấy bản ghi nào khớp với điều kiện lọc đặt ra. Hãy thử thay đổi từ khóa hoặc bộ lọc.'
                : 'Bạn chưa tạo bất cứ ghi chú nào. Hãy nhấp bắt đầu ngay để ghi chép ghi chú công việc an toàn.'}
            </p>
            {!searchQuery && activeFilter === 'all' && (
              <button
                onClick={handleCreateTrigger}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-5 py-3 rounded-2xl text-sm hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer shadow-lg shadow-indigo-900/10"
              >
                <span>➕ Tạo ghi chú đầu tiên</span>
              </button>
            )}
          </div>
        ) : (
          <div id="notesContainer" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">
            {sortedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onView={handleViewTrigger}
                onEdit={handleEditTrigger}
                onDelete={handleDeleteNote}
                onTogglePin={handleTogglePin}
                onUpdateStatus={(id, status) => handleUpdateNote(id, { status })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating installation PWA stimulus control */}
      {showInstallBtn && (
        <button
          id="installBtn"
          onClick={handleInstallAppClick}
          className="fixed bottom-24 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-4 rounded-2xl z-40 font-bold shadow-2xl flex items-center gap-2 transform active:scale-95 transition-transform text-white border border-blue-400/20 text-sm"
        >
          <span>📲 Cài đặt ứng dụng (PWA)</span>
        </button>
      )}

      {/* Triggered Alarm Popup dialog */}
      {triggeredAlarmNote && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30 animate-bounce">
              <Bell className="w-8 h-8 text-amber-400" />
            </div>
            
            <h3 className="text-2xl font-black text-amber-400 mb-2">⏰ ĐẾN GIỜ NHẮC NHỞ!</h3>
            <div className="p-4 bg-slate-850/60 rounded-2xl border border-slate-850 text-left mb-6 space-y-2">
              <h4 className="font-extrabold text-slate-100 uppercase tracking-wider text-sm truncate">
                {triggeredAlarmNote.title || 'Ghi chú khuyết'}
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed max-h-[140px] overflow-y-auto whitespace-pre-wrap">
                {triggeredAlarmNote.content}
              </p>
              {triggeredAlarmNote.remindTime && (
                <p className="text-[10px] text-amber-300/80 font-semibold bg-amber-500/10 px-2 py-1 rounded inline-block">
                  📅 Mốc lịch hẹn: {formatDate(triggeredAlarmNote.remindTime)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setTriggeredAlarmNote(null);
                  handleViewTrigger(triggeredAlarmNote);
                }}
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer"
              >
                🔎 Xem Chi tiết
              </button>
              <button
                onClick={() => setTriggeredAlarmNote(null)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer"
              >
                👌 Đã hiểu (Đóng)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Note Edit Modal controller */}
      <NoteEditorModal
        note={noteToEdit}
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setNoteToEdit(null);
        }}
        onSave={handleSaveNote}
        gdriveToken={gdriveToken}
        onLoginDrive={handleLoginDrive}
      />

      {/* Interactive Note Detail View Modal controller */}
      <NoteDetailModal
        note={selectedNote}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedNote(null);
        }}
        onSaveAiData={handleUpdateNote}
      />

      {/* Mobile control navigation utilities */}
      <MobileBottomBar
        onOpenNewNote={handleCreateTrigger}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
      />
    </div>
  );
}
