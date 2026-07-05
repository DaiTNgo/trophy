import * as React from "react";

import { cn } from "../../lib/utils";

export interface QuantityInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue"> {
  value: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  containerClassName?: string;
}

const MinusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className="icon icon-minus"
    fill="none"
    viewBox="0 0 10 2"
    width={10}
    height={2}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M.5 1C.5.7.7.5 1 .5h8a.5.5 0 110 1H1A.5.5 0 01.5 1z"
      fill="currentColor"
    />
  </svg>
);

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className="icon icon-plus"
    fill="none"
    viewBox="0 0 10 10"
    width={10}
    height={10}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1 4.51a.5.5 0 000 1h3.5l.01 3.5a.5.5 0 001-.01V5.5l3.5-.01a.5.5 0 00-.01-1H5.5L5.49.99a.5.5 0 00-1 .01v3.5l-3.5.01H1z"
      fill="currentColor"
    />
  </svg>
);

const QuantityInput = React.forwardRef<HTMLInputElement, QuantityInputProps>(
  (
    {
      className,
      containerClassName,
      value,
      onValueChange,
      onChange,
      min = 1,
      max = 99,
      step = 1,
      disabled,
      name,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const stepNum = typeof step === "number" ? step : 1;

    const handleDecrement = () => {
      const next = Math.max(min, value - stepNum);
      if (next !== value) {
        onValueChange?.(next);
      }
    };

    const handleIncrement = () => {
      const next = Math.min(max, value + stepNum);
      if (next !== value) {
        onValueChange?.(next);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const parsed = parseInt(raw, 10);
      if (isNaN(parsed)) return;
      const clamped = Math.max(min, Math.min(max, parsed));
      onValueChange?.(clamped);
      onChange?.(e);
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
          <MinusIcon />
        </button>

        <input
          type="number"
          name={name}
          value={value}
          onChange={handleInputChange}
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
          <PlusIcon />
        </button>
      </div>
    );
  },
);
QuantityInput.displayName = "QuantityInput";

export { QuantityInput };
