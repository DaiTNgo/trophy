import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";


type ContainerProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function Container({ children, className, ...props }: ContainerProps) {
  return (
    <div className={cn("container mx-auto w-full px-4 sm:px-6", className)} {...props}>
      {children}
    </div>
  );
}

export default Container;
