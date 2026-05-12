export default function AppShell({ children, fullHeight, contentClassName }) {
  const innerClass =
    contentClassName ||
    `max-w-5xl mx-auto w-full px-4 sm:px-6 pb-20 md:pb-0 ${fullHeight ? "flex min-h-0 flex-1 flex-col" : "py-8"}`;

  return <div className={innerClass}>{children}</div>;
}
