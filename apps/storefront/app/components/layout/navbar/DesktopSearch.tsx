import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useSearch } from "@/hooks/useSearch";
import { SearchResults } from "./SearchResults";

export function DesktopSearch() {
  const { query, setQuery, results, loading, clear } = useSearch();
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = focused && (query.trim().length > 0 || loading || results !== null);
  const showClear = query.length > 0;

  return (
    <div ref={wrapperRef} className="hidden lg:block relative grow max-w-3xl">
      <InputGroup className="rounded-full bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-100 transition-all h-10 shadow-none focus-within:ring-0 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
        <InputGroupAddon>
          <Search className="text-gray-500 text-[22px]" />
        </InputGroupAddon>
        <InputGroupInput
          className="text-[14px] text-gray-500 placeholder:text-gray-400"
          placeholder="Tìm kiếm sản phẩm, danh mục..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setFocused(false);
            }
          }}
        />
        {showClear && (
          <InputGroupAddon align="inline-end">
            <button
              onClick={clear}
              className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </InputGroupAddon>
        )}
      </InputGroup>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-[480px] overflow-y-auto">
          <SearchResults
            results={results}
            loading={loading}
            query={query}
            onResultClick={() => {
              setFocused(false);
              clear();
            }}
          />
        </div>
      )}
    </div>
  );
}
