import React from "react";
import AeButton from "../../../components/AeButton";
import GlobalStatsAnalytics from "../../../components/Trendminer/GlobalStatsAnalytics";
import { useSectionTheme } from "@/components/layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";

export default function TrendminerBanner() {
  const { colors } = useSectionTheme();
  const { isDark } = useTheme();
  
  return (
    <div 
      className="rounded-[24px] mt-4 mb-6" 
      style={{ 
        background: isDark 
          ? `linear-gradient(90deg, ${colors.primary}15, ${colors.primaryDark}15)` 
          : `linear-gradient(90deg, ${colors.primary}15, ${colors.primaryDark}15)` 
      }}
    >
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div 
              className={`text-center text-2xl sm:text-3xl lg:text-left lg:text-4xl font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              Every #Hashtag
              <br />
              is a Token.
              <br />
              Own the Trends.
            </div>
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <AeButton
                  variant="primary"
                  size="md"
                  rounded
                  onClick={() => (window.location.href = "/trends/create")}
                  className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 text-white hover:opacity-90"
                  style={{ 
                    background: colors.gradient,
                    boxShadow: `0 4px 16px ${colors.primary}40`
                  }}
                >
                  CREATE HASHTAG
                </AeButton>

                <AeButton
                  variant="accent"
                  size="md"
                  rounded
                  onClick={() => (window.location.href = "/trends/daos")}
                  className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 text-white hover:opacity-90"
                  style={{ 
                    background: colors.gradient,
                    boxShadow: `0 4px 16px ${colors.primary}40`
                  }}
                >
                  EXPLORE DAOS
                </AeButton>
                <AeButton
                  variant="ghost"
                  size="md"
                  rounded
                  onClick={() =>
                    (window.location.href = "/trends/invite")
                  }
                  className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 text-white hover:opacity-90"
                  style={{ 
                    background: colors.gradient,
                    boxShadow: `0 4px 16px ${colors.primary}40`
                  }}
                >
                  INVITE & EARN
                </AeButton>
              </div>

            </div>
            <div className={`text-sm mt-2.5 max-w-[720px] overflow-hidden text-ellipsis leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              Hashtags are tokenized trends with their own DAO and treasury.
              Prices move on a bonding curve - buy to support, sell to exit.
              Each hashtag community can fund initiatives through on-chain voting.
            </div>
          </div>
          <div className="min-w-[300px] flex-shrink-0 lg:mt-8">
            <GlobalStatsAnalytics />
          </div>
        </div>
      </div>
    </div>
  );
}
