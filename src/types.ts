/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Attachment {
  name: string;
  type: string;
  size: number;
  data: string; // Base64 representation of the file
  driveFileId?: string; // Google Drive unique file identifier
  webViewLink?: string; // Direct url link to Google Drive item preview
}

export type Priority = 'high' | 'medium' | 'low';
export type NoteStatus = 'none' | 'todo' | 'doing' | 'done';

export interface Note {
  id: string;
  title: string;
  content: string;
  priority: Priority;
  status?: NoteStatus;
  isPinned?: boolean;
  tags?: string[];
  remindTime: string; // ISO or local datetime format (YYYY-MM-DDTHH:MM)
  remindBefore: string; // Minutes as string, eg: "0", "5", "15", "30", "60", "1440"
  created: string; // ISO datetime string
  files?: Attachment[];
  aiSummary?: string;
  aiChecklist?: string[];
  color?: string; // Customized color preset for the note
}

export interface SyncConfig {
  apiUrl: string;
  useSync: boolean;
}
