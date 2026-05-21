'use client';

import { useEffect, useState } from 'react';

interface Existing {
  rating: number;
  title: string | null;
  body: string;
}

interface Props {
  productSku: string;
  productName: string;
  existing?: Existing;
  onClose: () => void;
  onSaved: () => void;
}

export function ReviewWriteModal({
  productSku,
  productName,
  existing,
  onClose,
  onSaved,
}: Props) {
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Esc closes
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productSku,
          rating,
          title: title.trim() || undefined,
          body: body.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not save review.');
        return;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-black/50 z-[300]"
      />
      <div className="fixed inset-0 z-[301] grid place-items-center px-4 py-8 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
          <div className="flex items-start justify-between px-6 py-4 border-b border-line">
            <div className="min-w-0">
              <h2 className="font-head text-lg font-bold text-ink">
                {existing ? 'Edit your review' : 'Write a review'}
              </h2>
              <div className="text-xs text-muted truncate mt-0.5">{productName}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full grid place-items-center text-muted text-2xl hover:bg-bg-soft"
            >
              ×
            </button>
          </div>

          <form onSubmit={submit} className="p-6 space-y-4">
            {/* Star picker */}
            <div>
              <label className="block text-xs text-muted font-semibold uppercase tracking-wider mb-2">
                Your rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n === 1 ? '' : 's'}`}
                    aria-pressed={rating === n}
                    className={`w-9 h-9 rounded grid place-items-center text-2xl transition ${
                      n <= rating ? 'text-yellow-500' : 'text-line hover:text-yellow-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="rv-title"
                className="block text-xs text-muted font-semibold uppercase tracking-wider mb-1.5"
              >
                Title (optional)
              </label>
              <input
                id="rv-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="e.g. Built like a tank, fries crisp every time"
                className="form-input"
              />
            </div>

            <div>
              <label
                htmlFor="rv-body"
                className="block text-xs text-muted font-semibold uppercase tracking-wider mb-1.5"
              >
                Your review
              </label>
              <textarea
                id="rv-body"
                required
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                minLength={10}
                placeholder="Tell other buyers what you liked, what to watch out for, and how it's performing in your kitchen."
                className="form-input resize-y"
              />
              <div className="text-[11px] text-muted mt-1 flex justify-between">
                <span>{body.length}/2000</span>
                <span>Minimum 10 characters</span>
              </div>
            </div>

            {error && (
              <div className="rounded border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-muted hover:text-ink px-3 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || body.trim().length < 10}
                className="px-5 py-2.5 rounded-md bg-brand text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {busy ? 'Saving…' : existing ? 'Update review' : 'Post review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
