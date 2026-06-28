import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";
import { CardContent } from "@/components/CardContent";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
};

export const KanbanCard = ({ card, onDelete }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_24px_rgba(3,33,71,0.08)]",
        "transition-all duration-150",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      data-testid={`card-${card.id}`}
    >
      <div className="flex items-start gap-3">
        <svg
          {...attributes}
          {...listeners}
          data-testid={`drag-handle-${card.id}`}
          width="10"
          height="16"
          viewBox="0 0 10 16"
          className="mt-0.5 shrink-0 cursor-grab opacity-30 active:cursor-grabbing"
        >
          <circle cx="3" cy="2"  r="1.5" fill="var(--navy-dark)" />
          <circle cx="7" cy="2"  r="1.5" fill="var(--navy-dark)" />
          <circle cx="3" cy="8"  r="1.5" fill="var(--navy-dark)" />
          <circle cx="7" cy="8"  r="1.5" fill="var(--navy-dark)" />
          <circle cx="3" cy="14" r="1.5" fill="var(--navy-dark)" />
          <circle cx="7" cy="14" r="1.5" fill="var(--navy-dark)" />
        </svg>
        <div className="flex flex-1 items-start justify-between gap-2">
          <CardContent card={card} />
          <button
            type="button"
            onClick={() => onDelete(card.id)}
            className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
            aria-label={`Delete ${card.title}`}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
};
