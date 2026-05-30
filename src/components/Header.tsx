/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Plus, RefreshCw, Radio, Settings, Check, Wifi, WifiOff } from 'lucide-react';
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
}: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState(syncConfig.apiUrl);
  const [tempUseSync, setTempUseSync] = useState(syncConfig.useSync);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSyncConfig({
      apiUrl: tempUrl.trim(),
      useSync: tempUseSync,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
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
              className="p-2.5 bg-slate-800/40 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700/50 transition-colors"
              title="Cấu hình đồng bộ"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              id="btn-manual-refresh"
              className="p-2.5 bg-slate-800/40 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700/50 transition-colors disabled:opacity-50"
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

        {/* Sync Settings Accordion */}
        {showSettings && (
          <div className="mt-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 animate-in fade-in slide-in-from-top-3 duration-200">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              Cấu hình Google Apps Script Sync
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
                  Kích hoạt đồng bộ đám mây (Google Sheets)
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
                  <p className="text-[10px] text-slate-500 leading-normal">
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
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-550 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors"
                >
                  {saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                  <span>{saveSuccess ? 'Đã lưu!' : 'Lưu lại'}</span>
                </button>
              </div>
            </form>
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
            className="w-full bg-slate-800/30 text-slate-100 rounded-xl pl-10 pr-4 py-2outline-none focus:ring-1 focus:ring-slate-700 border border-slate-800/85 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-slate-750 focus:bg-slate-800/40 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
