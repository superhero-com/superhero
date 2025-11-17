import { describe, expect, it } from "vitest";
import {
  getLeaderboardOrderBy,
  type LeaderboardMetric,
  type LeaderboardTimeframe,
} from "../api/leaderboard";

describe("leaderboard API helpers", () => {
  it("maps timeframe and metric to correct orderBy value", () => {
    const cases: Array<{
      timeframe: LeaderboardTimeframe;
      metric: LeaderboardMetric;
      expected: string;
    }> = [
      { timeframe: "24h", metric: "change", expected: "24hchange" },
      { timeframe: "24h", metric: "volume", expected: "24hvolume" },
      { timeframe: "7d", metric: "change", expected: "7dchange" },
      { timeframe: "7d", metric: "volume", expected: "7dvolume" },
      // 30d is not supported by the API, so we fall back to tvl
      { timeframe: "30d", metric: "change", expected: "tvl" },
      { timeframe: "30d", metric: "volume", expected: "tvl" },
    ];

    for (const { timeframe, metric, expected } of cases) {
      expect(getLeaderboardOrderBy(timeframe, metric)).toBe(expected);
    }
  });
});


