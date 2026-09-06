import { PrintButton } from "../roster";

export function SlotHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="sticky z-50 mb-4 flex items-center justify-between rounded-md bg-slate-500/50 backdrop-blur px-4 py-2 print:hidden"
      style={{ top: "64px" }}
    >
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-200">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {children}
        <PrintButton />
      </div>
    </div>
  );
}
