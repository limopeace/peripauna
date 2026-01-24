"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  History,
  Image as ImageIcon,
  Film,
  Star,
  Download,
  Trash2,
  Search,
  Filter,
  Maximize2,
} from "lucide-react";
import { useHistoryStore } from "@/lib/stores/historyStore";
import { GenerationRecord } from "@/types/history";
import { downloadGeneration } from "@/lib/services/downloadManager";
import { formatCost } from "@/lib/utils/costCalculator";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Lightbox } from "@/components/ui/Lightbox";

// ============================================
// History Panel Component
// ============================================
// Displays generation history with filtering and actions

export function HistoryPanel() {
  const {
    records,
    filters,
    isLoading,
    loadHistory,
    setFilters,
    resetFilters,
    toggleFavorite,
    deleteRecord,
    getFilteredRecords,
    selectRecord,
    selectedRecordId,
  } = useHistoryStore();

  const [showFilters, setShowFilters] = useState(false);

  // Lightbox state
  const [lightboxRecord, setLightboxRecord] = useState<GenerationRecord | null>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredRecords = getFilteredRecords();

  // Lightbox navigation
  const currentIndex = lightboxRecord
    ? filteredRecords.findIndex((r) => r.id === lightboxRecord.id)
    : -1;

  const handleLightboxPrev = useCallback(() => {
    if (currentIndex > 0) {
      setLightboxRecord(filteredRecords[currentIndex - 1]);
    }
  }, [currentIndex, filteredRecords]);

  const handleLightboxNext = useCallback(() => {
    if (currentIndex < filteredRecords.length - 1) {
      setLightboxRecord(filteredRecords[currentIndex + 1]);
    }
  }, [currentIndex, filteredRecords]);

  const handleLightboxDownload = useCallback(async () => {
    if (lightboxRecord) {
      await downloadGeneration(lightboxRecord);
    }
  }, [lightboxRecord]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <History size={18} className="text-muted-foreground" />
          <h2 className="font-semibold">History</h2>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {filteredRecords.length}
          </span>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            showFilters
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          )}
        >
          <Filter size={14} />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-3 border-b bg-muted/30 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search prompts..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              className="w-full pl-7 pr-2 py-1.5 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Type Filter */}
          <div className="flex gap-1">
            {(["all", "image", "video"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilters({ type })}
                className={cn(
                  "flex-1 px-2 py-1 text-xs rounded transition-colors capitalize",
                  filters.type === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border hover:bg-muted"
                )}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Period Filter */}
          <div className="flex gap-1">
            {(["all", "today", "week", "month"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setFilters({ period })}
                className={cn(
                  "flex-1 px-2 py-1 text-xs rounded transition-colors capitalize",
                  filters.period === period
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border hover:bg-muted"
                )}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Favorites Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.favoritesOnly}
              onChange={(e) => setFilters({ favoritesOnly: e.target.checked })}
              className="rounded"
            />
            <span className="text-xs">Favorites only</span>
          </label>

          {/* Reset Button */}
          <button
            onClick={resetFilters}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <History size={24} className="mb-2 opacity-50" />
            <p className="text-sm">No generations yet</p>
            <p className="text-xs">Your history will appear here</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredRecords.map((record) => (
              <HistoryItem
                key={record.id}
                record={record}
                isSelected={selectedRecordId === record.id}
                onSelect={() => selectRecord(record.id)}
                onFavorite={() => toggleFavorite(record.id)}
                onDelete={() => deleteRecord(record.id)}
                onEnlarge={() => setLightboxRecord(record)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox for enlarged preview */}
      {lightboxRecord && lightboxRecord.outputUrl && (
        <Lightbox
          isOpen={true}
          onClose={() => setLightboxRecord(null)}
          type={lightboxRecord.type}
          url={lightboxRecord.outputUrl}
          title={lightboxRecord.prompt?.substring(0, 100)}
          subtitle={`${lightboxRecord.model} • ${formatDistanceToNow(new Date(lightboxRecord.createdAt), { addSuffix: true })}`}
          onDownload={handleLightboxDownload}
          onPrevious={currentIndex > 0 ? handleLightboxPrev : undefined}
          onNext={currentIndex < filteredRecords.length - 1 ? handleLightboxNext : undefined}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < filteredRecords.length - 1}
        />
      )}
    </div>
  );
}

// ============================================
// History Item Component
// ============================================

interface HistoryItemProps {
  record: GenerationRecord;
  isSelected: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onEnlarge: () => void;
}

function HistoryItem({
  record,
  isSelected,
  onSelect,
  onFavorite,
  onDelete,
  onEnlarge,
}: HistoryItemProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!record.outputUrl) return;
    setIsDownloading(true);
    try {
      await downloadGeneration(record);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this generation from history?")) {
      onDelete();
    }
  };

  const statusColors = {
    queued: "bg-gray-100 text-gray-600",
    processing: "bg-blue-100 text-blue-600 animate-pulse",
    completed: "bg-green-100 text-green-600",
    failed: "bg-red-100 text-red-600",
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
        isSelected && "bg-muted"
      )}
    >
      <div className="flex gap-3">
        {/* Thumbnail - clickable for enlargement */}
        <div
          className="w-14 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0 relative group cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (record.outputUrl) onEnlarge();
          }}
        >
          {record.outputUrl || record.thumbnailUrl ? (
            <>
              {record.type === "image" ? (
                <img
                  src={record.thumbnailUrl || record.outputUrl}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={record.outputUrl}
                  className="w-full h-full object-cover"
                  muted
                />
              )}
              {/* Enlarge overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 size={16} className="text-white" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {record.type === "image" ? (
                <ImageIcon size={20} className="text-muted-foreground" />
              ) : (
                <Film size={20} className="text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Type + Status */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "px-1.5 py-0.5 text-[10px] font-medium rounded",
                statusColors[record.status]
              )}
            >
              {record.status}
            </span>
            {record.favorite && (
              <Star size={12} className="fill-yellow-400 text-yellow-400" />
            )}
          </div>

          {/* Prompt preview */}
          <p className="text-xs line-clamp-2 mb-1">{record.prompt}</p>

          {/* Meta */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{record.model}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}</span>
            {record.cost && record.cost > 0 && (
              <>
                <span>•</span>
                <span>{formatCost(record.cost)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-2 pl-[68px]">
        <button
          onClick={handleFavorite}
          className={cn(
            "p-1 rounded transition-colors",
            record.favorite
              ? "text-yellow-500"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Favorite"
        >
          <Star size={12} className={record.favorite ? "fill-current" : ""} />
        </button>
        {record.outputUrl && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnlarge();
              }}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="View full size"
            >
              <Maximize2 size={12} />
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Download"
            >
              <Download size={12} />
            </button>
          </>
        )}
        <button
          onClick={handleDelete}
          className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
