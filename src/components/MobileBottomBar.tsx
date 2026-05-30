/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Plus, RefreshCw, ArrowUp } from 'lucide-react';

interface MobileBottomBarProps {
  onOpenNewNote: () => void;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export default function MobileBottomBar({ onOpenNewNote, onRefresh, isRefreshing }: MobileBottomBarProps) {
  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mobile-bottom-bar block md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 pb-safe shadow-lg">
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={onOpenNewNote}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md shadow-blue-900/10 active:scale-95"
          title="Thêm ghi chú"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          title="Cập nhật đồng bộ"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={handleScrollTop}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title="Lên đầu trang"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
