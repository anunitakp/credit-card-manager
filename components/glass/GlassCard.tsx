import clsx from "clsx";

type Weight = "subtle" | "default" | "strong";

const WEIGHT_CLASS: Record<Weight, string> = {
  subtle: "glass-subtle",
  default: "glass",
  strong: "glass-strong",
};

interface Props extends React.HTMLAttributes<HTMLElement> {
  /** How opaque the pane is. Use `strong` for anything holding key numbers. */
  weight?: Weight;
  /** Adds the 1px lit top edge. On by default. */
  lit?: boolean;
  /** Soft accent glow — reserve for the single most important card. */
  glow?: boolean;
  /** Lifts on hover. Only for cards that are actually clickable. */
  interactive?: boolean;
  padded?: boolean;
  as?: "div" | "section" | "article" | "li";
}

export default function GlassCard({
  weight = "default",
  lit = true,
  glow = false,
  interactive = false,
  padded = true,
  as: Tag = "div",
  className,
  children,
  ...rest
}: Props) {
  return (
    <Tag
      className={clsx(
        WEIGHT_CLASS[weight],
        "rounded-2xl",
        lit && "glass-lit",
        glow && "glass-glow",
        padded && "p-5 sm:p-6",
        interactive &&
          "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-card-hover",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
