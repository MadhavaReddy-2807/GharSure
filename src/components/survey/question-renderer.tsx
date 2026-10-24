"use client";

import React, { useState } from "react";
import { Star, Check, ChevronDown, Calendar, ThumbsUp, ThumbsDown, Plus, Minus, Info } from "lucide-react";
import { SurveyQuestion } from "@/lib/survey-engine";

interface QuestionRendererProps {
  question: SurveyQuestion;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  error,
  disabled = false,
}: QuestionRendererProps) {
  const { questionType, options = [], questionText, description, isRequired, sectionName } = question;

  const renderControl = () => {
    switch (questionType) {
      // -----------------------------------------------------------------------
      // 1. SINGLE CHOICE (Dribbble Radio Card Style)
      // -----------------------------------------------------------------------
      case "SINGLE_CHOICE": {
        const selected = value ?? "";
        const optionsList = Array.isArray(options) ? options : [];

        return (
          <div className="space-y-3" role="radiogroup" aria-label={questionText}>
            {optionsList.map((opt: any, idx: number) => {
              const label = typeof opt === "object" ? opt.label || opt.value : opt;
              const val = typeof opt === "object" ? opt.value : opt;
              const isChecked = String(selected) === String(val);

              // Alphabet letter marker (A, B, C...)
              const letter = String.fromCharCode(65 + idx);

              return (
                <button
                  type="button"
                  key={idx}
                  role="radio"
                  aria-checked={isChecked}
                  disabled={disabled}
                  onClick={() => onChange(val)}
                  className={`w-full text-left p-4 sm:p-4.5 rounded-2xl border transition-all flex items-center justify-between text-xs sm:text-sm cursor-pointer group select-none ${
                    isChecked
                      ? "border-brand-purple bg-purple-50/50 text-slate-900 font-semibold ring-2 ring-brand-purple/20 shadow-xs"
                      : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 shadow-2xs"
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-3.5 pr-3">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                        isChecked
                          ? "bg-brand-purple text-white shadow-xs"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="leading-snug">{label}</span>
                  </div>

                  {/* Radio Indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isChecked
                        ? "border-brand-purple bg-brand-purple"
                        : "border-slate-300 bg-white group-hover:border-slate-400"
                    }`}
                  >
                    {isChecked && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 2. MULTIPLE CHOICE (Checkboxes / Multi-select Cards)
      // -----------------------------------------------------------------------
      case "MULTIPLE_CHOICE": {
        const selectedArray: string[] = Array.isArray(value) ? value : [];
        const optionsList = Array.isArray(options) ? options : [];

        const toggleOption = (val: string) => {
          if (selectedArray.includes(val)) {
            onChange(selectedArray.filter((item) => item !== val));
          } else {
            onChange([...selectedArray, val]);
          }
        };

        return (
          <div className="space-y-3" role="group" aria-label={questionText}>
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 mb-1">
              <span>Select all that apply</span>
              {selectedArray.length > 0 && (
                <span className="font-semibold text-brand-purple">
                  {selectedArray.length} selected
                </span>
              )}
            </div>

            {optionsList.map((opt: any, idx: number) => {
              const label = typeof opt === "object" ? opt.label || opt.value : opt;
              const val = typeof opt === "object" ? opt.value : opt;
              const isChecked = selectedArray.includes(val);

              return (
                <button
                  type="button"
                  key={idx}
                  role="checkbox"
                  aria-checked={isChecked}
                  disabled={disabled}
                  onClick={() => toggleOption(val)}
                  className={`w-full text-left p-4 sm:p-4.5 rounded-2xl border transition-all flex items-center justify-between text-xs sm:text-sm cursor-pointer group select-none ${
                    isChecked
                      ? "border-brand-purple bg-purple-50/50 text-slate-900 font-semibold ring-2 ring-brand-purple/20 shadow-xs"
                      : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 shadow-2xs"
                  } disabled:opacity-50`}
                >
                  <span className="leading-snug pr-3">{label}</span>

                  {/* Square Checkbox Indicator */}
                  <div
                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                      isChecked
                        ? "border-brand-purple bg-brand-purple text-white shadow-xs"
                        : "border-slate-300 bg-white group-hover:border-slate-400"
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 3. YES / NO (Friendly Big Toggle Buttons)
      // -----------------------------------------------------------------------
      case "YES_NO": {
        const isYes = value === true || value === "true" || value === "YES";
        const isNo = value === false || value === "false" || value === "NO";

        return (
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(true)}
              className={`p-5 sm:p-6 rounded-2xl border text-center font-bold text-sm sm:text-base transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group select-none ${
                isYes
                  ? "border-brand-purple bg-purple-50/60 text-brand-purple ring-2 ring-brand-purple/20 shadow-xs"
                  : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 shadow-2xs"
              } disabled:opacity-50`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isYes
                    ? "bg-brand-purple text-white shadow-xs"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                }`}
              >
                <ThumbsUp className="w-5 h-5" />
              </div>
              <span>Yes</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(false)}
              className={`p-5 sm:p-6 rounded-2xl border text-center font-bold text-sm sm:text-base transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group select-none ${
                isNo
                  ? "border-brand-purple bg-purple-50/60 text-brand-purple ring-2 ring-brand-purple/20 shadow-xs"
                  : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 shadow-2xs"
              } disabled:opacity-50`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isNo
                    ? "bg-brand-purple text-white shadow-xs"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                }`}
              >
                <ThumbsDown className="w-5 h-5" />
              </div>
              <span>No</span>
            </button>
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 4. DROPDOWN (Clean Select)
      // -----------------------------------------------------------------------
      case "DROPDOWN": {
        const optionsList = Array.isArray(options) ? options : [];

        return (
          <div className="relative">
            <select
              value={value ?? ""}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-12 pl-4 pr-10 rounded-2xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 font-medium appearance-none focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 shadow-2xs transition-all cursor-pointer"
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
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-4 pointer-events-none" />
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
          <div className="space-y-1.5">
            <input
              type="text"
              disabled={disabled}
              placeholder="Type your answer here..."
              value={textVal}
              maxLength={maxLen}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 shadow-2xs transition-all"
            />
            <div className="flex justify-end text-[10px] text-slate-400 px-1">
              <span>{textVal.length} / {maxLen}</span>
            </div>
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 6. LONG TEXT (Paragraph)
      // -----------------------------------------------------------------------
      case "LONG_TEXT": {
        const textVal = String(value ?? "");
        const maxLen = question.validationRules?.maxLength || 500;

        return (
          <div className="space-y-1.5">
            <textarea
              disabled={disabled}
              rows={4}
              placeholder="Share your thoughts or observations..."
              value={textVal}
              maxLength={maxLen}
              onChange={(e) => onChange(e.target.value)}
              className="w-full p-4 rounded-2xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 shadow-2xs transition-all resize-y"
            />
            <div className="flex justify-end text-[10px] text-slate-400 px-1">
              <span>{textVal.length} / {maxLen}</span>
            </div>
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 7. NUMBER (With optional stepper buttons)
      // -----------------------------------------------------------------------
      case "NUMBER": {
        const numVal = value !== undefined && value !== null && value !== "" ? Number(value) : "";
        const minVal = question.validationRules?.min;
        const maxVal = question.validationRules?.max;

        return (
          <div className="space-y-2">
            <div className="relative">
              <input
                type="number"
                disabled={disabled}
                placeholder="Enter a numeric value..."
                value={numVal}
                min={minVal}
                max={maxVal}
                onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full h-12 px-4 rounded-2xl border border-slate-200/90 bg-white text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 shadow-2xs transition-all"
              />
            </div>
            {(minVal !== undefined || maxVal !== undefined) && (
              <p className="text-[11px] text-slate-400 px-1">
                Supported range: {minVal ?? 0} to {maxVal ?? "unlimited"}
              </p>
            )}
          </div>
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
          <div className="space-y-2.5">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {scaleArray.map((num) => {
                const isSelected = rating === num;
                return (
                  <button
                    type="button"
                    key={num}
                    disabled={disabled}
                    onClick={() => onChange(num)}
                    className={`h-11 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center justify-center select-none ${
                      isSelected
                        ? "border-brand-purple bg-brand-purple text-white shadow-xs scale-105"
                        : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>1 - Poor / Unsatisfied</span>
              <span>10 - Outstanding</span>
            </div>
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 9. STAR RATING (1 - 5 Large Gold Stars)
      // -----------------------------------------------------------------------
      case "STAR_RATING": {
        const currentStars = Number(value || 0);
        const [hoverStars, setHoverStars] = useState<number | null>(null);
        const activeCount = hoverStars !== null ? hoverStars : currentStars;

        const starLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

        return (
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  disabled={disabled}
                  onMouseEnter={() => setHoverStars(star)}
                  onMouseLeave={() => setHoverStars(null)}
                  onClick={() => onChange(star)}
                  className="p-1 rounded-xl text-slate-300 hover:scale-115 focus:outline-none transition-all cursor-pointer"
                  title={`${star} Star${star > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                      star <= activeCount
                        ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                        : "fill-white text-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="text-xs font-semibold text-slate-700 h-5">
              {activeCount > 0 ? (
                <span className="text-brand-purple font-bold">
                  {activeCount} Star{activeCount > 1 ? "s" : ""} · {starLabels[activeCount - 1]}
                </span>
              ) : (
                <span className="text-slate-400">Click a star to rate</span>
              )}
            </div>
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 10. DATE PICKER
      // -----------------------------------------------------------------------
      case "DATE": {
        return (
          <div className="relative">
            <input
              type="date"
              disabled={disabled}
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 shadow-2xs transition-all"
            />
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 11. MATRIX / GRID (Responsive: Table on Desktop, Cards on Mobile)
      // -----------------------------------------------------------------------
      case "MATRIX": {
        const matrixDef =
          typeof options === "object" && !Array.isArray(options)
            ? {
                rows: options.matrixRows || options.rows || ["Statement 1", "Statement 2"],
                columns: options.matrixCols || options.columns || ["Poor", "Fair", "Good", "Excellent"],
              }
            : {
                rows: Array.isArray(options) && options.length > 0 ? options : ["Statement 1", "Statement 2"],
                columns: ["Poor", "Fair", "Good", "Excellent"],
              };

        const matrixAnswers: Record<string, string> = typeof value === "object" && value !== null ? value : {};

        return (
          <div className="space-y-3">
            {/* Mobile View: Cards per row (no horizontal scrolling!) */}
            <div className="sm:hidden space-y-3">
              {matrixDef.rows.map((row: string, rIdx: number) => (
                <div key={rIdx} className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                  <span className="text-xs font-bold text-slate-900 block">{row}</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {matrixDef.columns.map((col: string, cIdx: number) => {
                      const isChecked = matrixAnswers[row] === col;
                      return (
                        <button
                          type="button"
                          key={cIdx}
                          disabled={disabled}
                          onClick={() => onChange({ ...matrixAnswers, [row]: col })}
                          className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center select-none ${
                            isChecked
                              ? "border-brand-purple bg-brand-purple text-white shadow-xs"
                              : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100"
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

            {/* Desktop View: Clean Table */}
            <div className="hidden sm:block overflow-hidden border border-slate-200/90 rounded-2xl bg-white shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-4">Statement</th>
                    {matrixDef.columns.map((col: string, idx: number) => (
                      <th key={idx} className="p-3.5 text-center">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matrixDef.rows.map((row: string, rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-purple-50/20 transition-colors">
                      <td className="p-3.5 pl-4 font-semibold text-slate-800">{row}</td>
                      {matrixDef.columns.map((col: string, cIdx: number) => {
                        const isChecked = matrixAnswers[row] === col;
                        return (
                          <td key={cIdx} className="p-3.5 text-center">
                            <label className="cursor-pointer inline-flex items-center justify-center p-1">
                              <input
                                type="radio"
                                name={`matrix_${question.id}_${rIdx}`}
                                disabled={disabled}
                                checked={isChecked}
                                onChange={() =>
                                  onChange({
                                    ...matrixAnswers,
                                    [row]: col,
                                  })
                                }
                                className="w-4 h-4 text-brand-purple border-slate-300 focus:ring-brand-purple cursor-pointer"
                              />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            className="w-full h-12 px-4 rounded-2xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 font-medium"
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Question Header */}
      <div>
        {sectionName && (
          <div className="inline-block text-[10px] font-bold uppercase tracking-wider text-brand-purple bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100 mb-2">
            {sectionName}
          </div>
        )}
        <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug tracking-tight">
          {questionText}
          {isRequired && <span className="text-brand-purple ml-1">*</span>}
        </h2>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed font-normal">
            {description}
          </p>
        )}
      </div>

      {/* Render Answer Controls */}
      <div className="pt-2">{renderControl()}</div>

      {/* Inline Field Error */}
      {error && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-semibold flex items-center gap-1.5 animate-in fade-in duration-150">
          <Info className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
