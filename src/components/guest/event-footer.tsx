interface EventFooterProps {
  text: string;
}

export function EventFooter({ text }: EventFooterProps) {
  return (
    <footer className="mt-auto px-6 pb-10 pt-6">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
        <span className="h-px w-8 bg-border" aria-hidden />
        <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </footer>
  );
}
