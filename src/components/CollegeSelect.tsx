import React, { useState, useRef, useEffect } from "react";
import type { College } from "../types";
import { Building, ChevronDown, Check, Search, PlusCircle } from "lucide-react";

interface CollegeSelectProps {
  value: string;
  onChange: (value: string) => void;
  colleges: College[];
  isLoading?: boolean;
  required?: boolean;
}

export const CollegeSelect: React.FC<CollegeSelectProps> = ({
  value,
  onChange,
  colleges,
  isLoading = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCollegeText, setCustomCollegeText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // If initial value doesn't match any pre-configured college, check if it's a custom value
  useEffect(() => {
    if (value && colleges.length > 0) {
      const match = colleges.find((c) => c.name.toLowerCase() === value.toLowerCase());
      if (!match) {
        setIsCustomMode(true);
        setCustomCollegeText(value);
      }
    }
  }, [value, colleges]);

  const filteredColleges = colleges.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchName = c.name.toLowerCase().includes(q);
    const matchCode = c.code ? c.code.toLowerCase().includes(q) : false;
    return matchName || matchCode;
  });

  const handleSelectCollege = (collegeName: string) => {
    setIsCustomMode(false);
    setCustomCollegeText("");
    onChange(collegeName);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleEnableCustomMode = () => {
    setIsCustomMode(true);
    setIsOpen(false);
    setSearchTerm("");
    if (!customCollegeText && value) {
      setCustomCollegeText(value);
    }
  };

  const handleCustomTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setCustomCollegeText(text);
    onChange(text);
  };

  const handleBackToDropdown = () => {
    setIsCustomMode(false);
    setCustomCollegeText("");
    onChange("");
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-2">
      {/* Hidden input for HTML form submission validation */}
      <input
        type="text"
        name="college"
        id="college"
        required={required}
        value={value}
        onChange={() => {}}
        className="sr-only"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {!isCustomMode ? (
        <div className="relative">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setIsOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between gap-3 text-left pl-10 pr-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
              isOpen
                ? "border-[#16499c] ring-2 ring-[#16499c]/20 bg-white"
                : "border-slate-300 bg-white hover:border-[#16499c]/50 text-slate-900"
            } ${isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />

            <div className="truncate">
              {value ? (
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {value}
                </span>
              ) : (
                <span className="text-sm font-medium text-slate-400">
                  {isLoading ? "Loading colleges list..." : "Select your College / Institution..."}
                </span>
              )}
            </div>

            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                isOpen ? "transform rotate-180 text-[#16499c]" : ""
              }`}
            />
          </button>

          {/* Floating Dropdown Menu */}
          {isOpen && (
            <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-2xl border border-slate-200 bg-white shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 max-h-72 flex flex-col">
              {/* Search Bar inside dropdown */}
              <div className="relative pb-2 border-b border-slate-100">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type to filter colleges..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#16499c] focus:bg-white"
                />
              </div>

              {/* College Options List */}
              <div className="overflow-y-auto flex-1 py-1 space-y-0.5">
                {filteredColleges.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No matching colleges found.
                  </div>
                ) : (
                  filteredColleges.map((c) => {
                    const isSelected = value.toLowerCase() === c.name.toLowerCase();
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCollege(c.name)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#eff5ff] text-[#16499c] font-bold"
                            : "hover:bg-[#eff5ff]/50 text-slate-800 hover:text-[#16499c]"
                        }`}
                      >
                        <div className="truncate flex items-center gap-2">
                          <span className="truncate">{c.name}</span>
                          {c.code && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {c.code}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#16499c] shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Other Option */}
              <div className="pt-1.5 border-t border-slate-100 mt-1">
                <button
                  type="button"
                  onClick={handleEnableCustomMode}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#16499c] hover:bg-[#eff5ff] transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span>Other / My College is not listed</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Manual entry mode when student's college is not in the list */
        <div className="space-y-1.5">
          <div className="relative">
            <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              required={required}
              value={customCollegeText}
              onChange={handleCustomTextChange}
              placeholder="Enter full name of your college / institution..."
              className="w-full text-sm pl-10 pr-24 py-2.5 rounded-xl border border-[#16499c] bg-[#eff5ff]/30 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#16499c]/20"
            />
            <button
              type="button"
              onClick={handleBackToDropdown}
              className="absolute right-2 top-2 px-2.5 py-1 rounded-lg text-xs font-bold text-[#16499c] hover:bg-[#eff5ff] border border-[#16499c]/30 cursor-pointer"
            >
              List View
            </button>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Manual college entry enabled. Click &ldquo;List View&rdquo; to choose from standard college list.
          </p>
        </div>
      )}
    </div>
  );
};
