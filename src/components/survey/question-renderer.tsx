"use client";

import React from "react";
import { Star, Check } from "lucide-react";
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
  const { questionType, options = [], questionText, description, isRequired } = question;

  const renderControl = () => {
    switch (questionType) {
      case "SINGLE_CHOICE": {
        const selected = value ?? "";
        return (
          <div className="space-y-2.5">
            {options.map((opt: any, idx: number) => {
              const label = typeof opt === "object" ? opt.label || opt.value : opt;
              const val = typeof opt === "object" ? opt.value : opt;
              const isChecked = selected === val;

              return (
                <button
                  type="button"
                  key={idx}
                  disabled={disabled}
                  onClick={() => onChange(val)}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between text-xs sm:text-sm cursor-pointer ${
                    isChecked
                      ? "border-brand-purple bg-purple-50/50 text-slate-900 font-semibold ring-1 ring-brand-purple shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                  } disabled:opacity-50`}
                >
                  <span>{label}</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isChecked ? "border-brand-purple bg-brand-purple" : "border-slate-300 bg-white"
                    }`}
                  >
                    {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        );
      }

      case "MULTIPLE_CHOICE": {
        const selectedArray: string[] = Array.isArray(value) ? value : [];

        const toggleOption = (val: string) => {
          if (selectedArray.includes(val)) {
            onChange(selectedArray.filter((item) => item !== val));
          } else {
            onChange([...selectedArray, val]);
          }
        };

        return (
          <div className="space-y-2.5">
            {options.map((opt: any, idx: number) => {
              const label = typeof opt === "object" ? opt.label || opt.value : opt;
              const val = typeof opt === "object" ? opt.value : opt;
              const isChecked = selectedArray.includes(val);

              return (
                <button
                  type="button"
                  key={idx}
                  disabled={disabled}
                  onClick={() => toggleOption(val)}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between text-xs sm:text-sm cursor-pointer ${
                    isChecked
                      ? "border-brand-purple bg-purple-50/50 text-slate-900 font-semibold ring-1 ring-brand-purple shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                  } disabled:opacity-50`}
                >
                  <span>{label}</span>
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                      isChecked ? "border-brand-purple bg-brand-purple text-white" : "border-slate-300 bg-white"
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        );
      }

      case "YES_NO": {
        const valBool = value === true || value === "true" || value === "YES";
        const valFalse = value === false || value === "false" || value === "NO";

        return (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(true)}
              className={`p-4 rounded-xl border text-center font-semibold text-sm transition-all cursor-pointer ${
                valBool
                  ? "border-brand-purple bg-purple-50/50 text-brand-purple ring-1 ring-brand-purple shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(false)}
              className={`p-4 rounded-xl border text-center font-semibold text-sm transition-all cursor-pointer ${
                valFalse
                  ? "border-brand-purple bg-purple-50/50 text-brand-purple ring-1 ring-brand-purple shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
              }`}
            >
              No
            </button>
          </div>
        );
      }

      case "DROPDOWN": {
        return (
          <div>
            <select
              value={value ?? ""}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-navy"
            >
              <option value="">Select an option...</option>
              {options.map((opt: any, idx: number) => {
                const label = typeof opt === "object" ? opt.label || opt.value : opt;
                const val = typeof opt === "object" ? opt.value : opt;
                return (
                  <option key={idx} value={val}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        );
      }

      case "SHORT_TEXT": {
        return (
          <input
            type="text"
            disabled={disabled}
            placeholder="Type your answer here..."
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy transition-colors"
          />
        );
      }

      case "LONG_TEXT": {
        return (
          <textarea
            disabled={disabled}
            rows={4}
            placeholder="Share your thoughts in detail..."
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy transition-colors resize-y"
          />
        );
      }

      case "NUMBER": {
        return (
          <input
            type="number"
            disabled={disabled}
            placeholder="Enter a number..."
            value={value ?? ""}
            min={question.validationRules?.min}
            max={question.validationRules?.max}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy transition-colors"
          />
        );
      }

      case "RATING_SCALE": {
        const rating = Number(value || 0);
        const maxScale = question.validationRules?.max || 10;
        const scaleArray = Array.from({ length: maxScale }, (_, i) => i + 1);

        return (
          <div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {scaleArray.map((num) => {
                const isSelected = rating === num;
                return (
                  <button
                    type="button"
                    key={num}
                    disabled={disabled}
                    onClick={() => onChange(num)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? "border-brand-purple bg-brand-purple text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
              <span>Low / Poor</span>
              <span>High / Excellent</span>
            </div>
          </div>
        );
      }

      case "STAR_RATING": {
        const currentStars = Number(value || 0);

        return (
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                disabled={disabled}
                onClick={() => onChange(star)}
                className="p-1 rounded-lg text-slate-300 hover:text-amber-400 focus:outline-none transition-colors cursor-pointer"
              >
                <Star
                  className={`w-7 h-7 sm:w-8 sm:h-8 ${
                    star <= currentStars ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>
        );
      }

      case "DATE": {
        return (
          <input
            type="date"
            disabled={disabled}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-navy"
          />
        );
      }

      case "MATRIX": {
        // Matrix format: options: { rows: string[]; columns: string[] } or string[]
        const matrixDef =
          typeof options === "object" && !Array.isArray(options)
            ? (options as { rows: string[]; columns: string[] })
            : {
                rows: Array.isArray(options) && options.length > 0 ? options : ["Item 1", "Item 2"],
                columns: ["Poor", "Average", "Good", "Excellent"],
              };

        const matrixAnswers: Record<string, string> = typeof value === "object" && value !== null ? value : {};

        return (
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">Statement</th>
                  {matrixDef.columns.map((col, idx) => (
                    <th key={idx} className="p-3 text-center">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixDef.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-800">{row}</td>
                    {matrixDef.columns.map((col, cIdx) => {
                      const isChecked = matrixAnswers[row] === col;
                      return (
                        <td key={cIdx} className="p-3 text-center">
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
                            className="w-4 h-4 text-brand-orange border-slate-300 focus:ring-brand-orange cursor-pointer"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
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
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900"
          />
        );
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <label className="text-sm sm:text-base font-semibold text-brand-navy leading-snug">
            {questionText}
            {isRequired && <span className="text-brand-orange ml-1">*</span>}
          </label>
        </div>
        {description && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
        )}
      </div>

      <div className="pt-1">{renderControl()}</div>

      {error && (
        <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1.5">
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
