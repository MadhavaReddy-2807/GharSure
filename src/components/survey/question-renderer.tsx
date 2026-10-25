"use client";

import React, { useState } from "react";
import { Star, Check, ChevronDown, Calendar, Info } from "lucide-react";
import { SurveyQuestion } from "@/lib/survey-engine";

interface QuestionRendererProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  index?: number;
  hideHeader?: boolean;
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  error,
  disabled = false,
  index,
  hideHeader = false,
}: QuestionRendererProps) {
  const { questionType, options = [], questionText, description, isRequired, sectionName } = question;

  const renderControl = () => {
    switch (questionType) {
      // -----------------------------------------------------------------------
      // 1. SINGLE CHOICE (Clean Radio Row with Blue Accent)
      // -----------------------------------------------------------------------
      case "SINGLE_CHOICE": {
        const selected = value ?? "";
        const optionsList = Array.isArray(options) ? options : [];

        return (
          <div className="space-y-2" role="radiogroup" aria-label={questionText}>
            {optionsList.map((opt: any, idx: number) => {
              const label = typeof opt === "object" ? opt.label || opt.value : opt;
              const val = typeof opt === "object" ? opt.value : opt;
              const isChecked = String(selected) === String(val);

              return (
                <label
                  key={idx}
                  onClick={() => !disabled && onChange(val)}
                  className="flex items-center gap-3 py-1 cursor-pointer select-none group"
                >
                  {/* Radio Indicator */}
                  <div
                    className={`w-4.5 h-4.5 rounded-full border transition-all flex items-center justify-center shrink-0 ${
                      isChecked
                        ? "border-blue-600 bg-white"
                        : "border-slate-300 bg-white group-hover:border-slate-400"
                    } ${disabled ? "opacity-50" : ""}`}
                  >
                    {isChecked && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 transition-transform scale-100" />
                    )}
                  </div>

                  {/* Option Label Text */}
                  <span
                    className={`text-[13px] leading-tight transition-colors ${
                      isChecked
                        ? "text-blue-600 font-bold"
                        : "text-slate-600 font-medium group-hover:text-slate-800"
                    }`}
                  >
                    {label}
                  </span>
                </label>
              );
            })}
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 2. MULTIPLE CHOICE (Square Checkbox with Blue Selected State)
      // -----------------------------------------------------------------------
      case "MULTIPLE_CHOICE": {
        const selectedArray: string[] = Array.isArray(value) ? value : [];
        const optionsList = Array.isArray(options) ? options : [];

        const toggleOption = (val: string) => {
          if (disabled) return;
          if (selectedArray.includes(val)) {
            onChange(selectedArray.filter((item) => item !== val));
          } else {
            onChange([...selectedArray, val]);
          }
        };

        return (
          <div className="space-y-2" role="group" aria-label={questionText}>
            {optionsList.map((opt: any, idx: number) => {
              const label = typeof opt === "object" ? opt.label || opt.value : opt;
              const val = typeof opt === "object" ? opt.value : opt;
              const isChecked = selectedArray.includes(val);

              return (
                <label
                  key={idx}
                  onClick={() => toggleOption(val)}
                  className="flex items-center gap-3 py-1 cursor-pointer select-none group"
                >
                  {/* Square Checkbox (Exact Match to Reference Screenshot) */}
                  <div
                    className={`w-4.5 h-4.5 rounded-[5px] border transition-all flex items-center justify-center shrink-0 ${
                      isChecked
                        ? "border-blue-600 bg-blue-600 text-white shadow-2xs"
                        : "border-slate-300 bg-white group-hover:border-slate-400"
                    } ${disabled ? "opacity-50" : ""}`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  {/* Option Label Text: Bold Blue when selected */}
                  <span
                    className={`text-[13px] leading-tight transition-colors ${
                      isChecked
                        ? "text-blue-600 font-bold"
                        : "text-slate-600 font-medium group-hover:text-slate-800"
                    }`}
                  >
                    {label}
                  </span>
                </label>
              );
            })}
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 3. YES / NO (Compact Radio Rows)
      // -----------------------------------------------------------------------
      case "YES_NO": {
        const isYes = value === true || value === "true" || value === "YES";
        const isNo = value === false || value === "false" || value === "NO";

        return (
          <div className="space-y-2">
            {[
              { label: "Yes", val: true, isChecked: isYes },
              { label: "No", val: false, isChecked: isNo },
            ].map((item) => (
              <label
                key={item.label}
                onClick={() => !disabled && onChange(item.val)}
                className="flex items-center gap-3 py-1 cursor-pointer select-none group"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full border transition-all flex items-center justify-center shrink-0 ${
                    item.isChecked
                      ? "border-blue-600 bg-white"
                      : "border-slate-300 bg-white group-hover:border-slate-400"
                  } ${disabled ? "opacity-50" : ""}`}
                >
                  {item.isChecked && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  )}
                </div>
                <span
                  className={`text-[13px] leading-tight transition-colors ${
                    item.isChecked
                      ? "text-blue-600 font-bold"
                      : "text-slate-600 font-medium group-hover:text-slate-800"
                  }`}
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 4. DROPDOWN (Compact Clean Select)
      // -----------------------------------------------------------------------
      case "DROPDOWN": {
        const optionsList = Array.isArray(options) ? options : [];

        return (
          <div className="relative">
            <select
              value={value ?? ""}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 font-medium appearance-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
            >
              <option value="">Select your answer...</option>
              {optionsList.map((opt: any, idx: number) => {
                const label = typeof opt === "object" ? opt.label || opt.value : opt;
                const val = typeof opt === "object" ? opt.value : opt;
                return (
                  <option key={idx} value={val}>
                    {label}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 5. SHORT TEXT
      // -----------------------------------------------------------------------
      case "SHORT_TEXT": {
        const textVal = String(value ?? "");
        const maxLen = question.validationRules?.maxLength || 120;

        return (
          <input
            type="text"
            disabled={disabled}
            placeholder="Type your answer here..."
            value={textVal}
            maxLength={maxLen}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        );
      }

      // -----------------------------------------------------------------------
      // 6. LONG TEXT (Paragraph)
      // -----------------------------------------------------------------------
      case "LONG_TEXT": {
        const textVal = String(value ?? "");
        const maxLen = question.validationRules?.maxLength || 500;

        return (
          <textarea
            disabled={disabled}
            rows={3}
            placeholder="Share your thoughts or observations..."
            value={textVal}
            maxLength={maxLen}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-y"
          />
        );
      }

      // -----------------------------------------------------------------------
      // 7. NUMBER
      // -----------------------------------------------------------------------
      case "NUMBER": {
        const numVal = value !== undefined && value !== null && value !== "" ? Number(value) : "";
        const minVal = question.validationRules?.min;
        const maxVal = question.validationRules?.max;

        return (
          <input
            type="number"
            disabled={disabled}
            placeholder="Enter a numeric value..."
            value={numVal}
            min={minVal}
            max={maxVal}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        );
      }

      // -----------------------------------------------------------------------
      // 8. RATING SCALE (1 - 10 Pills)
      // -----------------------------------------------------------------------
      case "RATING_SCALE": {
        const rating = Number(value || 0);
        const maxScale = question.validationRules?.max || 10;
        const scaleArray = Array.from({ length: maxScale }, (_, i) => i + 1);

        return (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              {scaleArray.map((num) => {
                const isSelected = rating === num;
                return (
                  <button
                    type="button"
                    key={num}
                    disabled={disabled}
                    onClick={() => onChange(num)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center select-none ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white font-bold shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>1 - Poor</span>
              <span>10 - Excellent</span>
            </div>
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 9. STAR RATING (1 - 5 Stars)
      // -----------------------------------------------------------------------
      case "STAR_RATING": {
        const currentStars = Number(value || 0);
        const [hoverStars, setHoverStars] = useState<number | null>(null);
        const activeCount = hoverStars !== null ? hoverStars : currentStars;

        return (
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                disabled={disabled}
                onMouseEnter={() => setHoverStars(star)}
                onMouseLeave={() => setHoverStars(null)}
                onClick={() => onChange(star)}
                className="p-0.5 rounded focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                title={`${star} Star${star > 1 ? "s" : ""}`}
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    star <= activeCount
                      ? "fill-amber-400 text-amber-400"
                      : "fill-slate-100 text-slate-200"
                  }`}
                />
              </button>
            ))}
            {activeCount > 0 && (
              <span className="text-xs font-semibold text-blue-600 ml-2">
                {activeCount} / 5
              </span>
            )}
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 10. DATE
      // -----------------------------------------------------------------------
      case "DATE": {
        return (
          <input
            type="date"
            disabled={disabled}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        );
      }

      // -----------------------------------------------------------------------
      // 11. MATRIX
      // -----------------------------------------------------------------------
      case "MATRIX": {
        const matrixDef =
          typeof options === "object" && !Array.isArray(options)
            ? {
                rows: options.matrixRows || options.rows || ["Item 1", "Item 2"],
                columns: options.matrixCols || options.columns || ["Poor", "Fair", "Good", "Excellent"],
              }
            : {
                rows: Array.isArray(options) && options.length > 0 ? options : ["Item 1", "Item 2"],
                columns: ["Poor", "Fair", "Good", "Excellent"],
              };

        const matrixAnswers: Record<string, string> = typeof value === "object" && value !== null ? value : {};

        return (
          <div className="space-y-3">
            {matrixDef.rows.map((row: string, rIdx: number) => (
              <div key={rIdx} className="space-y-1.5 pb-2 border-b border-slate-100 last:border-b-0">
                <span className="text-xs font-semibold text-slate-700 block">{row}</span>
                <div className="flex flex-wrap gap-2">
                  {matrixDef.columns.map((col: string, cIdx: number) => {
                    const isChecked = matrixAnswers[row] === col;
                    return (
                      <button
                        type="button"
                        key={cIdx}
                        disabled={disabled}
                        onClick={() =>
                          onChange({
                            ...matrixAnswers,
                            [row]: col,
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          isChecked
                            ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      }

      default:
        return (
          <input
            type="text"
            disabled={disabled}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 font-medium"
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      {/* Question Header (Compact grey label + clean title matching reference screenshot) */}
      {!hideHeader && (
        <div className="space-y-0.5">
          <span className="text-[11px] font-medium text-slate-400 block tracking-normal">
            Question - {index !== undefined ? index + 1 : 1}
          </span>
          <h3 className="text-[13.5px] sm:text-sm font-semibold text-slate-800 leading-snug">
            {questionText}
            {isRequired && <span className="text-blue-600 ml-0.5">*</span>}
          </h3>
          {description && (
            <p className="text-[11px] text-slate-500 font-normal leading-normal">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Answer Controls */}
      <div className="pt-0.5">{renderControl()}</div>

      {/* Inline Field Error */}
      {error && (
        <div className="text-[11px] text-red-500 font-medium flex items-center gap-1 animate-in fade-in duration-100">
          <Info className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
