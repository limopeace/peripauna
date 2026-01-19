"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Image as ImageIcon,
  Film,
  DollarSign,
  Clock,
  TrendingUp,
  Calendar,
  Trash2,
} from "lucide-react";
import { useUsageStore } from "@/lib/stores/usageStore";
import { PeriodStats } from "@/types/history";
import { formatCost } from "@/lib/utils/costCalculator";
import { IMAGE_MODELS, VIDEO_MODELS } from "@/lib/config/modelPricing";
import { cn } from "@/lib/utils";

// ============================================
// Usage Dashboard Component
// ============================================
// Displays usage statistics, costs, and analytics

export function UsageDashboard() {
  const {
    isLoading,
    loadUsageData,
    getUsageStats,
    getUsageByPeriod,
    clearUsageData,
    totalCost,
    totalImages,
    totalVideos,
    costByModel,
  } = useUsageStore();

  const [selectedPeriod, setSelectedPeriod] = useState<
    "day" | "week" | "month" | "all"
  >("month");
  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null);

  // Load data on mount
  useEffect(() => {
    loadUsageData();
  }, [loadUsageData]);

  // Load period stats when period changes
  useEffect(() => {
    getUsageByPeriod(selectedPeriod).then(setPeriodStats);
  }, [selectedPeriod, getUsageByPeriod]);

  const stats = periodStats?.stats || getUsageStats();

  const handleClearUsage = () => {
    if (
      confirm(
        "Are you sure you want to clear all usage data? This cannot be undone."
      )
    ) {
      clearUsageData();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-primary" />
          <h2 className="text-lg font-semibold">Usage Dashboard</h2>
        </div>
        <button
          onClick={handleClearUsage}
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
        >
          <Trash2 size={12} />
          Clear Data
        </button>
      </div>

      {/* Period Selector */}
      <div className="flex gap-1">
        {(["day", "week", "month", "all"] as const).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={cn(
              "flex-1 px-3 py-2 text-sm rounded-md transition-colors capitalize",
              selectedPeriod === period
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {period === "all" ? "All Time" : `This ${period}`}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Images */}
        <StatCard
          icon={<ImageIcon size={18} />}
          label="Images"
          value={stats.totalImages.toString()}
          color="pink"
        />

        {/* Total Videos */}
        <StatCard
          icon={<Film size={18} />}
          label="Videos"
          value={stats.totalVideos.toString()}
          color="violet"
        />

        {/* Total Cost */}
        <StatCard
          icon={<DollarSign size={18} />}
          label="Total Spent"
          value={formatCost(stats.totalCost)}
          color="green"
        />

        {/* Success Rate */}
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Success Rate"
          value={`${Math.round(stats.successRate * 100)}%`}
          color="blue"
        />
      </div>

      {/* Cost by Model */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <DollarSign size={14} className="text-muted-foreground" />
          Cost by Model
        </h3>

        {Object.keys(stats.costByModel).length === 0 ? (
          <p className="text-sm text-muted-foreground">No usage data yet</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(stats.costByModel)
              .sort(([, a], [, b]) => b - a)
              .map(([model, cost]) => {
                const modelInfo =
                  IMAGE_MODELS.find((m) => m.id === model) ||
                  VIDEO_MODELS.find((m) => m.id === model);
                const percentage =
                  stats.totalCost > 0 ? (cost / stats.totalCost) * 100 : 0;

                return (
                  <div key={model} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{modelInfo?.name || model}</span>
                      <span className="font-medium">{formatCost(cost)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {stats.generationsByModel[model] || 0} generations
                      </span>
                      <span>{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Generation Time */}
      {stats.totalGenerationTime > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-muted-foreground" />
            <span className="text-sm">Total Generation Time</span>
          </div>
          <span className="font-medium text-sm">
            {formatDuration(stats.totalGenerationTime)}
          </span>
        </div>
      )}

      {/* Period Info */}
      {periodStats && selectedPeriod !== "all" && (
        <p className="text-xs text-muted-foreground text-center">
          Showing data from{" "}
          {new Date(periodStats.startDate).toLocaleDateString()} to{" "}
          {new Date(periodStats.endDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "pink" | "violet" | "green" | "blue";
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    pink: "bg-pink-500/10 text-pink-600",
    violet: "bg-violet-500/10 text-violet-600",
    green: "bg-green-500/10 text-green-600",
    blue: "bg-blue-500/10 text-blue-600",
  };

  return (
    <div className="p-3 bg-card border rounded-lg">
      <div className={cn("w-8 h-8 rounded-md flex items-center justify-center mb-2", colorClasses[color])}>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
