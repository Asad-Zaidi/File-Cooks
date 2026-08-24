import React from 'react';
import { FaWpforms } from 'react-icons/fa';

/**
 * Renders one input per detected AcroForm field (from POST
 * /api/pdf/forms/fields) and reports edits back as a controlled
 * {field_name: value} map, for POST /api/pdf/forms/fill.
 */
export default function FormFieldsFiller({ fields, values, onValuesChange }) {
  if (!fields || fields.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 text-center text-sm font-bold text-gray-500">
        This PDF has no fillable form fields.
      </div>
    );
  }

  const setValue = (name, value) => onValuesChange({ ...values, [name]: value });

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 px-1 flex items-center gap-1.5">
        <FaWpforms /> {fields.length} Field{fields.length === 1 ? '' : 's'} Detected
      </p>
      {fields.map((field) => (
        <div key={field.name} className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs">
          <label className="flex items-center justify-between text-xs font-black text-gray-800 mb-2">
            <span>{field.name}</span>
            <span className="text-[9px] font-bold uppercase text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {field.type}{field.is_required ? ' · Required' : ''}
            </span>
          </label>

          {field.type === 'CheckBox' ? (
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={values[field.name] === true || values[field.name] === 'Yes'}
                onChange={(e) => setValue(field.name, e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              <span>Checked</span>
            </label>
          ) : (field.type === 'ComboBox' || field.type === 'ListBox' || field.type === 'RadioButton') && field.options?.length ? (
            <select
              value={values[field.name] ?? ''}
              onChange={(e) => setValue(field.name, e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Select...</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={values[field.name] ?? ''}
              onChange={(e) => setValue(field.name, e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          )}
        </div>
      ))}
    </div>
  );
}
