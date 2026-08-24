import React, { useState } from 'react';
import { FaPlus, FaTrash, FaHighlighter } from 'react-icons/fa';

const TYPES = [
  { key: 'text', label: 'Text' },
  { key: 'rectangle', label: 'Rectangle' },
  { key: 'circle', label: 'Circle' },
  { key: 'line', label: 'Line' },
  { key: 'highlight', label: 'Highlight' },
  { key: 'underline', label: 'Underline' },
  { key: 'strikeout', label: 'Strikeout' },
  { key: 'squiggly', label: 'Squiggly' },
  { key: 'note', label: 'Sticky Note' },
  { key: 'redaction', label: 'Redaction' },
];

// Which fields each annotation type needs, and how to render each field.
const TYPE_FIELDS = {
  text: ['x', 'y', 'text', 'font_size', 'color'],
  rectangle: ['x', 'y', 'width', 'height', 'color', 'fill_color', 'opacity'],
  circle: ['x', 'y', 'width', 'height', 'color', 'fill_color', 'opacity'],
  line: ['x', 'y', 'x2', 'y2', 'color'],
  highlight: ['x', 'y', 'width', 'height', 'color', 'opacity'],
  underline: ['x', 'y', 'width', 'height', 'color', 'opacity'],
  strikeout: ['x', 'y', 'width', 'height', 'color', 'opacity'],
  squiggly: ['x', 'y', 'width', 'height', 'color', 'opacity'],
  note: ['x', 'y', 'text'],
  redaction: ['x', 'y', 'width', 'height', 'fill_color', 'text'],
};

const NUMBER_FIELDS = new Set(['x', 'y', 'width', 'height', 'x2', 'y2', 'font_size']);
const COLOR_FIELDS = new Set(['color', 'fill_color']);

const FIELD_LABELS = {
  x: 'X', y: 'Y', width: 'Width', height: 'Height', x2: 'X2', y2: 'Y2',
  text: 'Text', font_size: 'Font Size', color: 'Color', fill_color: 'Fill Color', opacity: 'Opacity',
};

const emptyDraft = (type) => ({ type, page: 1 });

/**
 * Self-contained annotation-op list builder for POST /api/pdf/annotate.
 * Controlled: `ops`/`onOpsChange` hold the pending list; this component
 * owns only the "add one more" draft form.
 *
 * Positions are in PDF points measured from the page's top-left corner
 * (PyMuPDF's page-space convention) -- there's no visual page preview yet
 * (that needs page rendering, not built in this pass), so this is a
 * coordinates-first tool rather than a click-to-place canvas.
 */
export default function AnnotationBuilder({ ops, onOpsChange, pageCount }) {
  const [draft, setDraft] = useState(emptyDraft('rectangle'));

  const setType = (type) => setDraft(emptyDraft(type));
  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const addOp = () => {
    const cleaned = { ...draft };
    for (const key of Object.keys(cleaned)) {
      if (NUMBER_FIELDS.has(key) && cleaned[key] !== undefined) cleaned[key] = Number(cleaned[key]);
    }
    onOpsChange([...ops, cleaned]);
    setDraft(emptyDraft(draft.type));
  };

  const removeOp = (index) => onOpsChange(ops.filter((_, i) => i !== index));

  const fields = TYPE_FIELDS[draft.type] || [];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs">
        <label className="block text-xs font-black text-gray-800 mb-2">Annotation Type</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {TYPES.map((t) => (
            <button
              key={t.key} type="button" onClick={() => setType(t.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-black transition-all ${
                draft.type === t.key
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-orange-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">Page (1–{pageCount || '?'})</label>
            <input
              type="number" min={1} max={pageCount || undefined} value={draft.page}
              onChange={(e) => setField('page', Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/60 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {fields.map((key) => (
            <div key={key}>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">{FIELD_LABELS[key]}</label>
              {key === 'text' ? (
                <input
                  type="text" value={draft.text || ''} onChange={(e) => setField('text', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/60 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              ) : key === 'opacity' ? (
                <input
                  type="range" min={0} max={1} step={0.05} value={draft.opacity ?? 1}
                  onChange={(e) => setField('opacity', Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              ) : COLOR_FIELDS.has(key) ? (
                <input
                  type="color" value={draft[key] || '#FF8800'} onChange={(e) => setField(key, e.target.value)}
                  className="w-full h-8 rounded-lg border border-gray-200 cursor-pointer"
                />
              ) : (
                <input
                  type="number" value={draft[key] ?? ''} onChange={(e) => setField(key, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/60 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              )}
            </div>
          ))}
        </div>

        <button
          type="button" onClick={addOp}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-black hover:bg-gray-800 transition-all"
        >
          <FaPlus size={11} />
          <span>Add to Queue</span>
        </button>
      </div>

      {ops.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 px-1">
            Queued Annotations ({ops.length})
          </p>
          {ops.map((op, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200/90 bg-white shadow-2xs">
              <FaHighlighter className="text-orange-500 shrink-0" size={13} />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-gray-800 capitalize">{op.type}</span>
                <span className="text-[10px] text-gray-400 font-medium ml-2">page {op.page}</span>
              </div>
              <button type="button" onClick={() => removeOp(index)} className="text-gray-300 hover:text-red-500">
                <FaTrash size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
