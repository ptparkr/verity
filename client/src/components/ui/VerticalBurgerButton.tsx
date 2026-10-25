interface VerticalBurgerButtonProps {
  onClick: () => void;
  isOpen?: boolean;
  title?: string;
  className?: string;
  ariaLabel?: string;
}

export function VerticalBurgerButton({
  onClick,
  isOpen = false,
  title = 'Toggle Menu',
  className = '',
  ariaLabel = 'Toggle navigation menu',
}: VerticalBurgerButtonProps) {
  return (
    <button
      type="button"
      className={`vertical-burger-btn ${isOpen ? 'is-open' : ''} ${className}`}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
    >
      <span className="vertical-burger-track" aria-hidden="true">
        <span className="vertical-burger-dot dot-top" />
        <span className="vertical-burger-dot dot-mid" />
        <span className="vertical-burger-dot dot-bot" />
      </span>
    </button>
  );
}
