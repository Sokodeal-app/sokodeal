import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./UI.module.css";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  inputClassName?: string;
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className,
  inputClassName,
  disabled,
  id,
  ...props
}: InputProps) {
  const helperId = helperText && id ? `${id}-helper` : undefined;
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <label className={cx(styles.field, className)} htmlFor={id}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <span
        className={cx(
          styles.inputWrap,
          error && styles.inputWrapError,
          disabled && styles.inputWrapDisabled
        )}
      >
        {leftIcon}
        <input
          aria-describedby={errorId ?? helperId}
          aria-invalid={error ? true : undefined}
          className={cx(styles.input, inputClassName)}
          disabled={disabled}
          id={id}
          {...props}
        />
        {rightIcon}
      </span>
      {error ? <span className={cx(styles.inputMeta, styles.inputError)} id={errorId}>{error}</span> : null}
      {!error && helperText ? <span className={styles.inputMeta} id={helperId}>{helperText}</span> : null}
    </label>
  );
}
