/** Small uppercase section label (nav groups, card groupings). */
export default function SectionLabel({ children, className = "", color }: { children: React.ReactNode; className?: string; color?: string }) {
  return (
    <div className={`text-[10px] font-bold uppercase tracking-wider ${className}`} style={color ? { color } : undefined}>
      {children}
    </div>
  );
}
