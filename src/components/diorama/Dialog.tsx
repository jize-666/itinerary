"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icons";
import { tr, type Lang } from "@/engine/diorama/strings";

export function DioDialog({
  lang,
  title,
  onClose,
  children,
  wide = false,
}: {
  lang: Lang;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    const previous = document.activeElement;
    d.showModal();
    return () => {
      d.close();
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"dio-dialog" + (wide ? " dio-dialog-wide" : "")}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
            onClose();
        }
      }}
    >
      <div className="dio-dialog-head">
        <h2>{title}</h2>
        <button type="button" className="dio-icon-btn" onClick={onClose} aria-label={tr(lang, "close")}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
