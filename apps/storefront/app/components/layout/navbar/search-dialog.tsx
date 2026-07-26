import { useState } from "react";
import { Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Container } from "@/components/container";
import { useSearch } from "@/hooks/useSearch";
import { SearchResults } from "./SearchResults";

export function NavbarSearchDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { query, setQuery, results, loading, clear } = useSearch();

  const showClear = query.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className="p-2 text-[#1a2e44] hover:text-primary transition-colors"
          aria-label="Tìm kiếm"
        >
          <Search className="w-5 h-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-none w-screen h-screen m-0 p-0! rounded-none border-none bg-white flex flex-col top-0 translate-y-0! data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0 duration-300">
        <DialogTitle className="sr-only">Tìm kiếm</DialogTitle>
        <Container className="flex flex-col h-full py-8">
          <div className="w-full max-w-3xl mx-auto mt-4">
            <InputGroup className="border-0 border-b-2 border-gray-200 rounded-none shadow-none bg-transparent h-auto focus-within:ring-0 has-[[data-slot=input-group-control]:focus-visible]:ring-0 has-[[data-slot=input-group-control]:focus-visible]:border-primary">
              <InputGroupAddon>
                <Search className="text-lg text-gray-400" />
              </InputGroupAddon>
              <InputGroupInput
                autoFocus
                className="bg-transparent border-0 px-0 py-2 h-auto text-lg font-light text-gray-900 placeholder:text-gray-300 focus-visible:outline-none focus-visible:ring-0"
                placeholder="Nhập từ khóa tìm kiếm..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {showClear && (
                <InputGroupAddon align="inline-end">
                  <button
                    onClick={clear}
                    className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Xóa tìm kiếm"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>

          <div className="w-full max-w-3xl mx-auto mt-6 flex-1 overflow-y-auto">
            <SearchResults
              results={results}
              loading={loading}
              query={query}
              onResultClick={() => {
                setIsOpen(false);
                clear();
              }}
            />
          </div>
        </Container>
      </DialogContent>
    </Dialog>
  );
}
