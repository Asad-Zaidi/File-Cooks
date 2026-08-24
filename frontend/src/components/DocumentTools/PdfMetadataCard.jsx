import React from 'react';
import { FaTag } from 'react-icons/fa';

// PDF date strings look like "D:20230115143022+00'00'" -- reformat into
// something readable when it matches, otherwise just show the raw value
// (docinfo lets producers put anything in this field).
function formatPdfDate(raw) {
  if (!raw) return null;
  const match = /^D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/.exec(raw);
  if (!match) return raw;
  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const FIELDS = [
  ['title', 'Title'],
  ['author', 'Author'],
  ['subject', 'Subject'],
  ['keywords', 'Keywords'],
  ['creator', 'Creator Application'],
  ['producer', 'PDF Producer'],
];

const DATE_FIELDS = [
  ['creation_date', 'Created'],
  ['mod_date', 'Last Modified'],
];

export default function PdfMetadataCard({ info, id }) {
  const hasAnyMetadata = [...FIELDS, ...DATE_FIELDS].some(([key]) => info[key]);

  return (
    <div id={id} className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs mb-6">
      <div className="flex items-center gap-2 text-sm font-black text-gray-900 border-b border-gray-100 pb-3 mb-3">
        <FaTag className="text-orange-500" />
        <span>Document Metadata</span>
      </div>

      {!hasAnyMetadata ? (
        <p className="text-xs text-gray-500 font-medium py-2">
          This document has no title, author, or other docinfo metadata set.
        </p>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {FIELDS.map(([key, label]) => (
            <div key={key} className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</dt>
              <dd className="text-sm font-semibold text-gray-800 truncate" title={info[key] || undefined}>
                {info[key] || <span className="text-gray-300 font-medium">Not set</span>}
              </dd>
            </div>
          ))}
          {DATE_FIELDS.map(([key, label]) => (
            <div key={key} className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</dt>
              <dd className="text-sm font-semibold text-gray-800 truncate" title={info[key] || undefined}>
                {formatPdfDate(info[key]) || <span className="text-gray-300 font-medium">Not set</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
