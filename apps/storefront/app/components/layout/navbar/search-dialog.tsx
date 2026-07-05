import { Search } from "lucide-react";
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

interface NavbarSearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export function NavbarSearchDialog({ isOpen, onOpenChange, className }: NavbarSearchDialogProps) {
  return (
    <div className={`grow xl:flex items-center max-w-3xl ${className}`}>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <InputGroup className="w-full cursor-pointer rounded-full bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-100 transition-all h-10 shadow-none focus-within:ring-0 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
            <InputGroupAddon>
              <Search className="text-gray-500 text-[22px]" />
            </InputGroupAddon>
            <InputGroupInput
              className="text-[14px] text-gray-500 placeholder:text-gray-400 cursor-pointer"
              placeholder="Tìm kiếm sản phẩm, danh mục..."
              readOnly
            />
          </InputGroup>
        </DialogTrigger>
        <DialogContent className="max-w-none w-screen h-screen m-0 p-0! rounded-none border-none bg-surface/95 backdrop-blur-md flex flex-col top-0 translate-y-0! data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0 duration-300">
          <DialogTitle className="sr-only">Tìm kiếm</DialogTitle>
          <Container className="flex flex-col h-full py-8">
            <div className="w-full max-w-3xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
              <InputGroup className="border-0 border-b-2 border-on-surface-variant/20 rounded-none shadow-none bg-transparent h-auto focus-within:ring-0 has-[[data-slot=input-group-control]:focus-visible]:ring-0 has-[[data-slot=input-group-control]:focus-visible]:border-primary">
                <InputGroupInput
                  autoFocus
                  className="bg-transparent border-0 px-0 pb-4 h-auto text-3xl font-light text-on-surface placeholder:text-on-surface-variant/30 focus-visible:outline-none focus-visible:ring-0"
                  placeholder="Nhập từ khóa tìm kiếm..."
                  type="text"
                />
                <InputGroupAddon align="inline-end" className="py-0">
                  <Search className="text-3xl text-on-surface-variant/50" />
                </InputGroupAddon>
              </InputGroup>
            </div>
          </Container>
        </DialogContent>
      </Dialog>
    </div>
  );
}
