import React from "react";

export interface AnimatedCheckboxProps {
  id?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  color?: string;
  size?: number | string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  onClick?: (e: React.MouseEvent<HTMLLabelElement>) => void;
}

export const AnimatedCheckbox = React.forwardRef<HTMLInputElement, AnimatedCheckboxProps>(
  (
    {
      id,
      checked = false,
      onChange,
      color = "#942392",
      size = 20,
      className = "",
      disabled = false,
      readOnly = false,
      name,
      onClick,
    },
    ref
  ) => {
    const pixelSize = typeof size === "number" ? `${size}px` : size;

    return (
      <label
        onClick={onClick}
        className={`uiverse-checkbox-container ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
        style={{
          "--cb-color": color,
          width: pixelSize,
          height: pixelSize,
        } as React.CSSProperties}
      >
        <input
          ref={ref}
          type="checkbox"
          id={id}
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          readOnly={readOnly}
        />
        <svg
          viewBox="0 0 64 64"
          style={{ width: pixelSize, height: pixelSize }}
        >
          <path
            d="M 0 16 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 16 L 32 48 L 64 16 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 16"
            pathLength="575.0541381835938"
            className="path"
          />
        </svg>
      </label>
    );
  }
);

AnimatedCheckbox.displayName = "AnimatedCheckbox";

export default AnimatedCheckbox;
