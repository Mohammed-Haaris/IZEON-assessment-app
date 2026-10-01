import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  disabled = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
          disabled
            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
            : isOpen
            ? "bg-white border-emerald-500 ring-2 ring-emerald-500/15 shadow-sm"
            : "bg-white border-slate-200 hover:border-emerald-300 text-slate-800 hover:bg-emerald-50/20 shadow-xs"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={selectedOption ? "text-slate-900 font-semibold" : "text-slate-400"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "transform rotate-180 text-emerald-600" : ""
          }`}
        />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in-50 zoom-in-95 duration-150">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 text-center">No options available</div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-950 font-bold"
                      : "text-slate-700 hover:bg-emerald-50/50 hover:text-emerald-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <div>
                      <div className="truncate flex items-center gap-1.5">
                        <span>{opt.label}</span>
                        {opt.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
