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

