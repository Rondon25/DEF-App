import { LAB, CARD_SHADOW } from "../../theme/lab";

/** White rounded card with the lab soft shadow + optional title/right slot. */
export default function LabCard({
  title, right, children, className = "", bodyClassName = "",
}: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`} style={{ background: LAB.card, boxShadow: CARD_SHADOW }}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-4">
          {title ? <h3 className="font-bold text-sm">{title}</h3> : <span />}
          {right}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
