/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Priority, NoteStatus } from './types';

/**
 * Format date string with Vietnamese locale (vi-VN)
 */
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (error) {
    return '';
  }
}

/**
 * Convert a standard File instance into Base64 format string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
}

/**
 * Format raw byte size into a beautiful, human-readable string
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Returns priority metadata (color, label, icon)
 */
export function getPriorityMetadata(priority: Priority) {
  switch (priority) {
    case 'high':
      return {
        label: 'Khẩn cấp',
        color: 'border-l-8 border-l-red-500 hover:border-l-red-400',
        textColor: 'text-red-400',
        bgColor: 'bg-red-500/10',
        badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
        dotColor: 'bg-red-500',
        icon: '🔴',
      };
    case 'medium':
      return {
        label: 'Quan trọng',
        color: 'border-l-8 border-l-amber-500 hover:border-l-amber-400',
        textColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        dotColor: 'bg-amber-500',
        icon: '🟠',
      };
    case 'low':
    default:
      return {
        label: 'Bình thường',
        color: 'border-l-8 border-l-emerald-500 hover:border-l-emerald-400',
        textColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        dotColor: 'bg-emerald-500',
        icon: '🟢',
      };
  }
}

/**
 * Identifies the file group icon and extension label
 */
export function getFileGroup(type: string, name: string) {
  const extension = name.split('.').pop()?.toLowerCase() || '';
  
  if (type.startsWith('image/')) {
    return { icon: '🖼️', label: 'Hình ảnh' };
  }
  if (type === 'application/pdf' || extension === 'pdf') {
    return { icon: '📕', label: 'Tài liệu PDF' };
  }
  if (
    type.includes('msword') || 
    type.includes('officedocument.wordprocessingml') ||
    ['doc', 'docx'].includes(extension)
  ) {
    return { icon: '📘', label: 'Tài liệu Word' };
  }
  if (
    type.includes('ms-excel') || 
    type.includes('officedocument.spreadsheetml') ||
    ['xls', 'xlsx', 'csv'].includes(extension)
  ) {
    return { icon: '📗', label: 'Bảng tính Excel' };
  }
  
  return { icon: '📎', label: 'Tệp đính kèm' };
}

/**
 * Returns task status metadata (color, label, icon)
 */
export function getStatusMetadata(status: NoteStatus | undefined) {
  const s = status || 'none';
  switch (s) {
    case 'todo':
      return {
        label: 'To-Do (Chưa Đạt)',
        badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/15',
        dotColor: 'bg-indigo-400',
        icon: '⏳',
      };
    case 'doing':
      return {
        label: 'Đang Thực Hiện',
        badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/15',
        dotColor: 'bg-amber-400',
        icon: '⚡',
      };
    case 'done':
      return {
        label: 'Đã Hoàn Thành',
        badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/15',
        dotColor: 'bg-emerald-400',
        icon: '✅',
      };
    case 'none':
    default:
      return {
        label: 'Ghi chú / Nháp',
        badgeColor: 'bg-slate-500/10 text-slate-400 border-slate-500/15',
        dotColor: 'bg-slate-500',
        icon: '📝',
      };
  }
}

export interface ColorPreset {
  id: string;
  label: string;
  bgClass: string;
  hoverBgClass: string;
  borderClass: string;
  textMuted: string;
  accentClass: string;
  bgHexColors: string; // Used for color picker selectors
}

export const NOTE_COLORS: ColorPreset[] = [
  {
    id: 'default',
    label: 'Mặc định',
    bgClass: 'bg-slate-850/20',
    hoverBgClass: 'hover:bg-slate-800/30',
    borderClass: 'border-slate-800/80 hover:border-slate-750/70',
    textMuted: 'text-slate-500',
    accentClass: 'text-indigo-400',
    bgHexColors: '#1e293b',
  },
  {
    id: 'indigo',
    label: 'Tím Indigo',
    bgClass: 'bg-indigo-950/15',
    hoverBgClass: 'hover:bg-indigo-950/25',
    borderClass: 'border-indigo-500/25 hover:border-indigo-500/40',
    textMuted: 'text-indigo-400/70',
    accentClass: 'text-indigo-300',
    bgHexColors: '#312e81',
  },
  {
    id: 'emerald',
    label: 'Xanh lục bảo',
    bgClass: 'bg-emerald-950/15',
    hoverBgClass: 'hover:bg-emerald-950/25',
    borderClass: 'border-emerald-500/25 hover:border-emerald-500/40',
    textMuted: 'text-emerald-400/70',
    accentClass: 'text-emerald-300',
    bgHexColors: '#064e3b',
  },
  {
    id: 'ocean',
    label: 'Xanh đại dương',
    bgClass: 'bg-sky-950/15',
    hoverBgClass: 'hover:bg-sky-950/25',
    borderClass: 'border-sky-500/25 hover:border-sky-500/40',
    textMuted: 'text-sky-400/70',
    accentClass: 'text-sky-300',
    bgHexColors: '#0c4a6e',
  },
  {
    id: 'amber',
    label: 'Hổ phách',
    bgClass: 'bg-amber-950/15',
    hoverBgClass: 'hover:bg-amber-950/25',
    borderClass: 'border-amber-500/25 hover:border-amber-500/40',
    textMuted: 'text-amber-400/70',
    accentClass: 'text-amber-300',
    bgHexColors: '#78350f',
  },
  {
    id: 'rose',
    label: 'Hồng nhung',
    bgClass: 'bg-rose-950/10',
    hoverBgClass: 'hover:bg-rose-950/20',
    borderClass: 'border-rose-500/25 hover:border-rose-500/40',
    textMuted: 'text-rose-400/70',
    accentClass: 'text-rose-300',
    bgHexColors: '#4c0519',
  },
  {
    id: 'violet',
    label: 'Hoa oải hương',
    bgClass: 'bg-violet-950/15',
    hoverBgClass: 'hover:bg-violet-950/25',
    borderClass: 'border-violet-500/25 hover:border-violet-500/40',
    textMuted: 'text-violet-400/70',
    accentClass: 'text-violet-300',
    bgHexColors: '#4c1d95',
  },
  {
    id: 'teal',
    label: 'Thanh ngọc',
    bgClass: 'bg-teal-950/15',
    hoverBgClass: 'hover:bg-teal-950/25',
    borderClass: 'border-teal-500/25 hover:border-teal-500/40',
    textMuted: 'text-teal-400/70',
    accentClass: 'text-teal-300',
    bgHexColors: '#115e59',
  }
];

export function getNoteColorMetadata(colorId: string | undefined): ColorPreset {
  const defaultPreset = NOTE_COLORS[0];
  if (!colorId) return defaultPreset;
  return NOTE_COLORS.find(p => p.id === colorId) || defaultPreset;
}


