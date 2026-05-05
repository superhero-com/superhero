import { useRef } from 'react';
import { Calendar } from 'lucide-react';
import {
  LEADERBOARD_METRIC_OPTIONS,
  LEADERBOARD_TIMEFRAME_OPTIONS,
} from '../../constants/leaderboard';
import type {
  LeaderboardMetric,
  LeaderboardTimeframe,
} from '../../api/leaderboard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';

export interface LeaderboardDateRangeInputs {
  startDate: string;
  endDate: string;
}

interface LeaderboardFiltersProps {
  timeframe: LeaderboardTimeframe;
  metric: LeaderboardMetric;
  dateRange: LeaderboardDateRangeInputs;
  onTimeframeChange: (value: LeaderboardTimeframe) => void;
  onMetricChange: (value: LeaderboardMetric) => void;
  onDateRangeChange: (value: LeaderboardDateRangeInputs) => void;
}

const formatDateTimeInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  let formatted = digits.slice(0, 2);

  if (digits.length > 2) formatted += `/${digits.slice(2, 4)}`;
  if (digits.length > 4) formatted += `/${digits.slice(4, 8)}`;
  if (digits.length > 8) formatted += ` ${digits.slice(8, 10)}`;
  if (digits.length > 10) formatted += `:${digits.slice(10, 12)}`;

  return formatted;
};

const DATE_TIME_INPUT_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/;

const toPickerValue = (value: string) => {
  const match = DATE_TIME_INPUT_PATTERN.exec(value);
  if (!match) return '';

  const [, day, month, year, hour, minute] = match;
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const fromPickerValue = (value: string) => {
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return '';

  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year} ${timePart}`;
};

interface DateTimeRangeInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

const DateTimeRangeInput = ({
  label,
  placeholder,
  value,
  onChange,
}: DateTimeRangeInputProps) => {
  const pickerRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;

    picker.focus();
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
      return;
    }

    picker.click();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openPicker}
        className="absolute left-2.5 top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-md text-white/35 transition-colors hover:bg-white/10 hover:text-white/70 focus:outline-none focus:ring-1 focus:ring-[#1161FE]/60"
        aria-label={`Choose ${label.toLowerCase()} from calendar`}
      >
        <Calendar
          aria-hidden="true"
          className="h-3.5 w-3.5"
        />
      </button>
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(formatDateTimeInput(event.target.value))}
        maxLength={16}
        className="w-full h-10 rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-xs text-white placeholder:text-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none backdrop-blur-[10px] transition-all duration-300 hover:bg-white/[0.06] focus:border-[#1161FE] focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(17,97,254,0.18)]"
        aria-label={`${label} in dd/mm/yyyy hh:mm format`}
      />
      <input
        ref={pickerRef}
        type="datetime-local"
        value={toPickerValue(value)}
        onChange={(event) => onChange(fromPickerValue(event.target.value))}
        className="absolute left-3 top-2.5 h-px w-px opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
};

export const LeaderboardFilters = ({
  timeframe,
  metric,
  dateRange,
  onTimeframeChange,
  onMetricChange,
  onDateRangeChange,
}: LeaderboardFiltersProps) => (
  <div className="flex flex-col md:flex-row w-full gap-3 md:items-center">
    {/* Timeframe segmented control */}
    <div className="w-full md:w-auto flex-1">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] uppercase tracking-wide text-white/40">
          Timeframe
        </span>
      </div>
      <div className="grid w-full grid-cols-3 gap-2">
        {LEADERBOARD_TIMEFRAME_OPTIONS.map((option) => {
          const isActive = option.value === timeframe;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onTimeframeChange(option.value)}
              className={`px-2 py-2 h-10 text-xs rounded-lg border transition-all duration-300 focus:outline-none ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-lg'
                  : 'bg-white/[0.02] text-white border-white/10 hover:bg-white/[0.05]'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>

    {/* Custom date range */}
    <div className="w-full md:w-auto md:min-w-[460px]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] uppercase tracking-wide text-white/40">
          Custom range
        </span>
        <span className="text-[10px] text-white/30">
          dd/mm/yyyy hh:mm
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <DateTimeRangeInput
          label="Leaderboard start date and time"
          placeholder="Start: dd/mm/yyyy hh:mm"
          value={dateRange.startDate}
          onChange={(startDate) => onDateRangeChange({
            ...dateRange,
            startDate,
          })}
        />
        <DateTimeRangeInput
          label="Leaderboard end date and time"
          placeholder="End: dd/mm/yyyy hh:mm"
          value={dateRange.endDate}
          onChange={(endDate) => onDateRangeChange({
            ...dateRange,
            endDate,
          })}
        />
      </div>
    </div>

    {/* Metric selector */}
    <div className="w-full md:w-auto flex-shrink-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] uppercase tracking-wide text-white/40">
          Sort by
        </span>
      </div>
      <div className="w-full md:w-auto">
        <Select
          value={metric}
          onValueChange={(value) => onMetricChange(value as LeaderboardMetric)}
        >
          <SelectTrigger className="px-2 py-2 h-10 bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-lg text-xs focus:outline-none focus:border-[#1161FE] transition-all duration-300 hover:bg-white/[0.05] w-full md:min-w-[140px]">
            <SelectValue placeholder="Metric" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-white/10">
            {LEADERBOARD_METRIC_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-white hover:bg-white/10 text-xs"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
);
