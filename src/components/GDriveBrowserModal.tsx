/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, Folder, File, ExternalLink, Calendar, HardDrive } from 'lucide-react';
import { GDriveFile, listDriveFiles } from '../utils/gdriveApi';
import { formatBytes, getFileGroup } from '../utils';

interface GDriveBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onSelectFile: (file: GDriveFile) => void;
}

export default function GDriveBrowserModal({
  isOpen,
  onClose,
  accessToken,
  onSelectFile,
}: GDriveBrowserModalProps) {
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<GDriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial root level files on open
  useEffect(() => {
    if (isOpen && accessToken) {
      fetchFiles();
    }
  }, [isOpen, accessToken]);

  const fetchFiles = async (searchTerm: string = '') => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listDriveFiles(accessToken, searchTerm);
      setFiles(data);
    } catch (err: any) {
      console.error(err);
      setError('Không thể tải danh sách tài liệu từ Google Drive của bạn. Vui lòng kiểm tra lại quyền truy cập.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles(search);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm justify-center items-center z-[60] p-4 flex">
      <div className="glass-panel w-full max-w-xl rounded-2xl p-5 sm:p-6 max-h-[85vh] overflow-y-auto shadow-2xl relative border border-slate-700/80 animate-in zoom-in-95 duration-200 flex flex-col gap-4">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
              Chọn tệp từ Google Drive
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700/60 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên tệp trên Google Drive..."
              className="w-full bg-slate-900/60 text-slate-100 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 border border-slate-750"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-650 hover:bg-indigo-600 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Tìm kiếm
          </button>
        </form>

        {/* File list container */}
        <div className="flex-1 overflow-y-auto min-h-[250px] max-h-[400px] border border-slate-800 rounded-xl bg-slate-900/10 p-1 space-y-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <span className="text-xs">Đang nạp tập tin từ Drive...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16 px-4">
              <p className="text-xs text-red-400 font-medium mb-1">⚠️ Lỗi kết cấu</p>
              <p className="text-[11px] text-slate-500 leading-normal">{error}</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-xs">
              Mục này trống hoặc không tìm thấy tệp.
            </div>
          ) : (
            files.map((file) => {
              const fileGroup = getFileGroup(file.mimeType, file.name);
              const fileSize = file.size ? formatBytes(parseInt(file.size)) : 'Unknown Size';
              
              return (
                <div
                  key={file.id}
                  onClick={() => onSelectFile(file)}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-slate-850 hover:bg-slate-800/20 text-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                    <span className="text-lg shrink-0">{fileGroup.icon}</span>
                    <div className="truncate">
                      <p className="font-bold text-slate-200 group-hover:text-white truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{fileGroup.label}</span>
                        <span>•</span>
                        <span>{fileSize}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-slate-800 text-slate-500 hover:text-indigo-400 rounded transition-colors"
                        title="Xem trực tiếp trên Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => onSelectFile(file)}
                      className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded text-[10px] font-semibold transition-colors shrink-0"
                    >
                      Đính kèm
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="text-[10px] text-slate-500 leading-normal text-center bg-slate-900/30 p-2 rounded-lg border border-slate-850">
          Nhấn Đính kèm hoặc nhấp chuột vào tệp tin để đút tệp Google Drive này trực tiếp vào tài liệu ghi chú hiện tại của bạn.
        </div>

      </div>
    </div>
  );
}
