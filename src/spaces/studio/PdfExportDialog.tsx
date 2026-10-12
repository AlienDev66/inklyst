import { useState } from "react";
import type { Book } from "./books";
import { exportPdf, type PdfOptions } from "./exportBook";

export function PdfExportDialog({
  book,
  open,
  onClose,
}: {
  book: Book;
  open: boolean;
  onClose: () => void;
}) {
  const [opts, setOpts] = useState<PdfOptions>({
    font: "times",
    fontSize: 11,
    margin: 64,
    includeCover: true,
    includeToc: true,
  });

  if (!open) return null;

  return (
    <div className="cmdk-backdrop" role="presentation" onClick={onClose}>
      <div className="pdf-dialog" role="dialog" aria-label="Exportar PDF" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">PDF</p>
        <h2>{book.title || "Sem título"}</h2>
        <label className="inline-field">
          <span>Tipografia</span>
          <select
            value={opts.font}
            onChange={(e) => setOpts((o) => ({ ...o, font: e.target.value as PdfOptions["font"] }))}
          >
            <option value="times">Times (livro)</option>
            <option value="helvetica">Helvetica (limpo)</option>
            <option value="courier">Courier (máquina)</option>
          </select>
        </label>
        <label className="inline-field">
          <span>Corpo ({opts.fontSize} pt)</span>
          <input
            type="range"
            min={10}
            max={14}
            value={opts.fontSize}
            onChange={(e) => setOpts((o) => ({ ...o, fontSize: Number(e.target.value) }))}
          />
        </label>
        <label className="inline-field">
          <span>Margens ({opts.margin} pt)</span>
          <input
            type="range"
            min={48}
            max={88}
            step={4}
            value={opts.margin}
            onChange={(e) => setOpts((o) => ({ ...o, margin: Number(e.target.value) }))}
          />
        </label>
        <label className="session-opt">
          <input
            type="checkbox"
            checked={opts.includeCover}
            onChange={(e) => setOpts((o) => ({ ...o, includeCover: e.target.checked }))}
          />
          Incluir capa
        </label>
        <label className="session-opt">
          <input
            type="checkbox"
            checked={opts.includeToc}
            onChange={(e) => setOpts((o) => ({ ...o, includeToc: e.target.checked }))}
          />
          Incluir índice
        </label>
        <div className="diff-actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              void exportPdf(book, opts);
              onClose();
            }}
          >
            Exportar PDF
          </button>
          <button type="button" className="text-btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
