import * as React from "react";

import { cn } from "../../lib/utils";
import { MinusIcon, PlusIcon } from 'lucide-react'

export interface QuantityInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue"> {
  value: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  commitOnBlur?: boolean;
  containerClassName?: string;
}

const QuantityInput = React.forwardRef<HTMLInputElement, QuantityInputProps>(
  (
    {
      className,
      containerClassName,
      value,
      onValueChange,
      onChange,
      onBlur,
      min = 1,
      max = 99,
      commitOnBlur = false,
      step = 1,
      disabled,
      name,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const stepNum = typeof step === "number" ? step : 1;
    const [inputValue, setInputValue] = React.useState(() => String(value));

    React.useEffect(() => {
      setInputValue(String(value));
    }, [value]);

    const clampValue = React.useCallback(
      (nextValue: number) => Math.max(min, Math.min(max, nextValue)),
      [max, min],
    );

    const handleDecrement = () => {
      const next = clampValue(value - stepNum);
      if (next !== value) {
        setInputValue(String(next));
        onValueChange?.(next);
      }
    };

    const handleIncrement = () => {
      const next = clampValue(value + stepNum);
      if (next !== value) {
        setInputValue(String(next));
        onValueChange?.(next);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setInputValue(raw);

      const parsed = parseInt(raw, 10);
      if (!commitOnBlur && !isNaN(parsed)) {
        onValueChange?.(parsed);
      }

      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.target.value, 10);
      const next = isNaN(parsed) ? min : clampValue(parsed);

      setInputValue(String(next));
      if (next !== value) {
        onValueChange?.(next);
      }

      onBlur?.(e);
    };

    return (
      <div
        className={cn(
          "quantity cart-quantity inline-flex items-center h-10 rounded bg-muted",
          disabled && "opacity-50 pointer-events-none",
          containerClassName,
        )}
      >
        <button
          type="button"
          name="minus"
          className={cn(
            "quantity__button flex items-center justify-center h-full w-9 text-muted-foreground",
            "hover:text-foreground transition-colors",
            value <= min && "cursor-not-allowed opacity-30",
          )}
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          aria-label={ariaLabel ? `Decrease quantity for ${ariaLabel}` : "Decrease quantity"}
        >
          <span className="sr-only">
            {ariaLabel ? `Decrease quantity for ${ariaLabel}` : "Decrease quantity"}
          </span>
          <MinusIcon size={16} />
        </button>

        <input
          type="number"
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          ref={ref}
          className={cn(
            "quantity__input h-full w-12 border-0 bg-transparent text-center text-sm font-semibold",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            className,
          )}
          aria-label={ariaLabel ? `Quantity for ${ariaLabel}` : "Quantity"}
          {...props}
        />

        <button
          type="button"
          name="plus"
          className={cn(
            "quantity__button flex items-center justify-center h-full w-9 text-muted-foreground",
            "hover:text-foreground transition-colors",
            value >= max && "cursor-not-allowed opacity-30",
          )}
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          aria-label={ariaLabel ? `Increase quantity for ${ariaLabel}` : "Increase quantity"}
        >
          <span className="sr-only">
            {ariaLabel ? `Increase quantity for ${ariaLabel}` : "Increase quantity"}
          </span>
          <PlusIcon size={16} />
        </button>
      </div>
    );
  },
);
QuantityInput.displayName = "QuantityInput";

export { QuantityInput };
