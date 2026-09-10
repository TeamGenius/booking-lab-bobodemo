import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Rect = { top: number; left: number; width: number; height: number };

function selectorRect(selector: string | undefined): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function Spotlight({
  target,
  caption,
  detail,
}: {
  target?: string;
  caption: string;
  detail?: string;
}) {
  const [rect, setRect] = useState<Rect | null>(() => selectorRect(target));

  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      if (!mounted) return;
      setRect(selectorRect(target));
    };
    refresh();
    const t = window.setInterval(refresh, 250);
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    return () => {
      mounted = false;
      window.clearInterval(t);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
    };
  }, [target]);

  const padding = 8;
  const box = rect
    ? {
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }
    : null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 380,
      }}
    >
      {box ? (
        <div
          style={{
            position: 'absolute',
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            border: '2px solid var(--mantine-color-purple-6)',
            borderRadius: 8,
            boxShadow: '0 0 0 9999px rgba(15, 5, 40, 0.55)',
            transition: 'all 200ms ease',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 5, 40, 0.35)',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'white',
          borderRadius: 12,
          padding: '10px 16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          maxWidth: 480,
          pointerEvents: 'auto',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14 }}>{caption}</div>
        {detail && (
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{detail}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
