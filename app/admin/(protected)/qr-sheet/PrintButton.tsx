"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-neutral-100 text-neutral-900 px-4 py-2 font-semibold hover:bg-white"
    >
      Print this sheet
    </button>
  );
}
