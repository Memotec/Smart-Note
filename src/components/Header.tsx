/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Plus, RefreshCw, Radio, Settings, Check, Wifi, WifiOff, Database, Download, Upload, HardDrive, LogOut, Loader2, Cloud } from 'lucide-react';
import { SyncConfig } from '../types';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenNewNote: () => void;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  syncConfig: SyncConfig;
  onUpdateSyncConfig: (config: SyncConfig) => void;
  isOnline: boolean;
  onExportJSON: () => void;
  onImportJSON: (jsonText: string, strategy: 'overwrite' | 'merge') => void;
  
  // Google Drive scopes & auth
  gdriveUser: any | null;
  gdriveToken: string | null;
  onLoginDrive: () => Promise<void>;
  onLogoutDrive: () => Promise<void>;
  onBackupDrive: () => Promise<void>;
  onRestoreDrive: (strategy: 'overwrite' | 'merge') => Promise<void>;
  isBackingUpDrive: boolean;
  isRestoringDrive: boolean;
}

export default function Header({
  searchQuery,
  setSearchQuery,
  onOpenNewNote,
  onRefresh,
  isRefreshing,
  syncConfig,
  onUpdateSyncConfig,
  isOnline,
  onExportJSON,
  onImportJSON,
  
  gdriveUser,
  gdriveToken,
  onLoginDrive,
  onLogoutDrive,
  onBackupDrive,
  onRestoreDrive,
  isBackingUpDrive,
  isRestoringDrive,
}: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState(syncConfig.apiUrl);
  const [tempUseSync, setTempUseSync] = useState(syncConfig.useSync);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStrategy, setImportStrategy] = useState<'overwrite' | 'merge'>('merge');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSyncConfig({
      apiUrl: tempUrl.trim(),
      useSync: tempUseSync,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleFileImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string || '';
      onImportJSON(text, importStrategy);
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto p-4 sm:p-5">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                Notes<span className="text-indigo-500 font-bold">.</span>
              </h1>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                syncConfig.useSync && isOnline
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/50'
              }`}>
                {syncConfig.useSync && isOnline ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    <span>Đồng bộ</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>Ngoại tuyến</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Ghi chép tối giản và quản lý công việc hiệu suất cao
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowSettings(!showSettings)}
              id="btn-settings-toggle"
              className="p-2.5 bg-slate-800/40 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700/50 transition-colors cursor-pointer"
              title="Cấu hình đồng bộ"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              id="btn-manual-refresh"
              className="p-2.5 bg-slate-800/40 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700/50 transition-colors disabled:opacity-50 cursor-pointer"
              title="Làm mới ghi chú"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onOpenNewNote}
              id="btn-create-note"
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-550 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Ghi chú mới</span>
            </button>
          </div>
        </div>

        {/* Settings, Sync & Backup Accordion */}
        {showSettings && (
          <div className="mt-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 animate-in fade-in slide-in-from-top-3 duration-200 space-y-4">
            
            {/* Sync service block */}
            <div className="bg-slate-900/30 p-3.5 rounded-lg border border-slate-800/40">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                Đồng bộ đám mây (Google Sheets)
              </h3>
              <form onSubmit={handleSaveSettings} className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="useSync"
                    checked={tempUseSync}
                    onChange={(e) => setTempUseSync(e.target.checked)}
                    className="w-4 h-4 text-indigo-500 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500/40 cursor-pointer"
                  />
                  <label htmlFor="useSync" className="text-xs text-slate-300 font-medium cursor-pointer selection:bg-transparent">
                    Kích hoạt đồng bộ đám mây
                  </label>
                </div>

                {tempUseSync && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Script URL (Macro Web App)
                    </label>
                    <input
                      type="url"
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 border border-slate-750"
                      required={tempUseSync}
                    />
                    <p className="text-[10px] text-slate-505 leading-normal">
                      Nhập đường dẫn Google Apps Script Web App của bạn để tự động nạp, cập nhật và đồng bộ ghi chú trực tuyến.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-700/30">
                  <button
                    type="button"
                    onClick={() => {
                      setTempUrl(syncConfig.apiUrl);
                      setTempUseSync(syncConfig.useSync);
                      setShowSettings(false);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-550 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    {saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                    <span>{saveSuccess ? 'Đã lưu!' : 'Lưu lại'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Google Drive Backup & Sync Block */}
            <div className="bg-slate-900/30 p-3.5 rounded-lg border border-slate-800/40 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                Sao lưu đám mây Google Drive (Hoàn toàn Bảo mật)
              </h3>
              
              {!gdriveUser ? (
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Kết nối tài khoản Google để thực hiện sao lưu trực tiếp ghi chú của bạn lên Google Drive cá nhân, tăng khả năng lưu trữ không giới hạn và khôi phục dễ dàng.
                  </p>
                  
                  {/* Styled Sign In With Google Button */}
                  <button
                    type="button"
                    onClick={onLoginDrive}
                    className="gsi-material-button w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 hover:bg-white text-slate-900 font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer border border-slate-200"
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span className="text-xs">Đăng nhập bằng Google</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2 truncate">
                      {gdriveUser.photoURL ? (
                        <img
                          src={gdriveUser.photoURL}
                          alt="Avatar"
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-full border border-indigo-500/30"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-indigo-650 flex items-center justify-center text-white text-[10px] font-bold">
                          {gdriveUser.email?.[0].toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-[11px] font-bold text-slate-205 truncate">
                          {gdriveUser.displayName || 'Google User'}
                        </p>
                        <p className="text-[9px] text-slate-500 truncate">
                          {gdriveUser.email}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={onLogoutDrive}
                      className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Đăng xuất"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                    <button
                      type="button"
                      onClick={onBackupDrive}
                      disabled={isBackingUpDrive}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-550 disabled:opacity-50 text-white font-medium px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      {isBackingUpDrive ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Cloud className="w-3.5 h-3.5" />
                      )}
                      <span>{isBackingUpDrive ? 'Đang sao lưu...' : 'Sao lưu lên Drive'}</span>
                    </button>

                    <div className="flex-1 flex items-center gap-2">
                      <select
                        value={importStrategy}
                        onChange={(e) => setImportStrategy(e.target.value as 'overwrite' | 'merge')}
                        className="bg-slate-900 border border-slate-750 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer flex-1"
                      >
                        <option value="merge">Nhập thêm (Hợp nhất)</option>
                        <option value="overwrite">Ghi đè (Sạch)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => onRestoreDrive(importStrategy)}
                        disabled={isRestoringDrive}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 hover:text-white font-medium px-3 py-2 rounded-lg text-xs transition-colors border border-slate-700/50 cursor-pointer"
                      >
                        {isRestoringDrive ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span>Khôi phục</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Offline Backup & Restore Block */}
            <div className="bg-slate-900/30 p-3.5 rounded-lg border border-slate-800/40 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                Sao lưu & Khôi phục dữ liệu (Offline)
              </h3>
              <p className="text-[10px] text-slate-500 leading-normal">
                Sao lưu toàn bộ ghi chú ngoại tuyến của bạn thành một tệp dữ liệu JSON để lưu trữ, hoặc khôi phục từ tệp tin đã sao lưu trước đây.
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                {/* Export Action */}
                <button
                  type="button"
                  onClick={onExportJSON}
                  className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-medium px-3 py-2 rounded-lg text-xs transition-colors border border-slate-700/50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Xuất tệp JSON (.json)</span>
                </button>

                {/* Import Strategy and Trigger Input */}
                <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={importStrategy}
                    onChange={(e) => setImportStrategy(e.target.value as 'overwrite' | 'merge')}
                    className="bg-slate-900 text-slate-200 border border-slate-750 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
                  >
                    <option value="merge">Nhập thêm (Hợp nhất không xóa)</option>
                    <option value="overwrite">Ghi đè (Nhập mới hoàn toàn)</option>
                  </select>

                  <label className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 font-medium px-3 py-2 rounded-lg text-xs transition-colors border border-indigo-500/15 cursor-pointer text-center">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Chọn tệp & Khôi phục</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileImportChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Search Bar Grid */}
        <div className="mt-4 relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm tiêu đề, nội dung hoặc nhãn..."
            className="w-full bg-slate-800/30 text-slate-100 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-1 focus:ring-slate-700 border border-slate-800/85 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-slate-750 focus:bg-slate-800/40 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
