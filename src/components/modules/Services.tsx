import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, LayoutGrid, List, Tag, Clock,
  Pencil, Copy, Trash2, X, Check,
} from 'lucide-react';
import { useAppContext } from '../../App';
import { AgencyService } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const CATEGORIES = ['Diseño', 'Edición', 'Video', 'Marketing', 'Otro'];

type ViewMode = 'grid' | 'list';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v);

// ─── Margin helpers ───────────────────────────────────────────────────────────

function calcMargin(service: AgencyService, bepHourlyRate: number): number | null {
  if (!service.estimatedHours || service.price <= 0 || bepHourlyRate <= 0) return null;
  const cost = service.estimatedHours * bepHourlyRate;
  return ((service.price - cost) / service.price) * 100;
}

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-gray-600 text-xs">—</span>;
  const pct = `${margin.toFixed(0)}%`;
  if (margin >= 50)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
        {pct}
      </span>
    );
  if (margin >= 30)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#7F54F5]/20 text-[#7F54F5]">
        {pct}
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FD8000]/20 text-[#FD8000]">
      {pct}
    </span>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface ServiceForm {
  name: string;
  category: string;
  estimatedHours: string;
  description: string;
  margin: string;
}

const BLANK_FORM: ServiceForm = {
  name: '',
  category: CATEGORIES[0],
  estimatedHours: '',
  description: '',
  margin: '40',
};

const inputCls =
  'h-10 w-full bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg px-3 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors';

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServicesModule() {
  const {
    services,
    handleAddService,
    handleUpdateService,
    handleDeleteService,
    bepHourlyRate,
  } = useAppContext();

  // ── View state ────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingService, setEditingService] = useState<AgencyService | null>(null);
  const [form, setForm] = useState<ServiceForm>(BLANK_FORM);

  // ── Delete confirmation ───────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = services;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      );
    }
    if (activeCategory !== 'Todos') {
      result = result.filter(s => s.category === activeCategory);
    }
    return result;
  }, [services, searchQuery, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: services.length };
    CATEGORIES.forEach(cat => {
      counts[cat] = services.filter(s => s.category === cat).length;
    });
    return counts;
  }, [services]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditingService(null);
    setModalMode('create');
  };

  const openEdit = (service: AgencyService) => {
    const existingMargin =
      service.estimatedHours && service.price > 0 && bepHourlyRate > 0
        ? Math.round(
            ((service.price - service.estimatedHours * bepHourlyRate) / service.price) * 100
          )
        : 40;
    setForm({
      name: service.name,
      category: service.category,
      estimatedHours: service.estimatedHours ? String(service.estimatedHours) : '',
      description: service.description,
      margin: String(Math.max(0, existingMargin)),
    });
    setEditingService(service);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingService(null);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const hours = parseFloat(form.estimatedHours) || 0;
    const margin = Math.min(99, Math.max(0, parseFloat(form.margin) || 0));
    const price = hours > 0 ? (hours * bepHourlyRate) / (1 - margin / 100) : 0;

    const data = {
      name: form.name.trim(),
      category: form.category,
      estimatedHours: hours || undefined,
      description: form.description.trim(),
      price,
    };

    if (modalMode === 'create') handleAddService(data);
    else if (editingService) handleUpdateService({ ...editingService, ...data });
    closeModal();
  };

  const handleDuplicate = (service: AgencyService) => {
    handleAddService({
      name: `Copia de ${service.name}`,
      category: service.category,
      estimatedHours: service.estimatedHours,
      description: service.description,
      price: service.price,
    });
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    if (!modalMode) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSaveRef.current();
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = modalMode ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modalMode]);

  // ── Calculator preview ────────────────────────────────────────────────────
  const previewHours = parseFloat(form.estimatedHours) || 0;
  const previewMargin = Math.min(99, Math.max(0, parseFloat(form.margin) || 0));
  const bepCost = previewHours * bepHourlyRate;
  const suggestedPrice = previewHours > 0 ? bepCost / (1 - previewMargin / 100) : 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar servicios…"
            className="w-full h-10 bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg pl-9 pr-3 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-lg bg-[#1C1C1C] border border-[#7F54F5]/20 p-0.5 shrink-0">
          {([
            { mode: 'grid' as ViewMode, Icon: LayoutGrid },
            { mode: 'list' as ViewMode, Icon: List },
          ]).map(({ mode, Icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === mode
                  ? 'bg-[#FFCC00]/20 text-[#FFCC00]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>

        {/* New service button */}
        <button
          onClick={openCreate}
          className="shrink-0 h-10 px-4 rounded-lg bg-[#FD8000] text-white text-sm font-semibold hover:bg-[#E57200] transition-colors"
        >
          + Nuevo Servicio
        </button>
      </div>

      {/* ── Category pills ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['Todos', ...CATEGORIES]).map(cat => {
          const count = categoryCounts[cat] ?? 0;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#7F54F5] text-white'
                  : 'bg-[#1C1C1C] text-gray-400 hover:text-gray-200 border border-[#7F54F5]/20'
              }`}
            >
              {cat}
              <span
                className={`text-[10px] font-bold px-1 rounded-full ${
                  isActive ? 'bg-white/20' : 'bg-[#7F54F5]/20 text-[#7F54F5]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1C1C1C] border border-[#7F54F5]/20 flex items-center justify-center">
            <Tag size={24} className="text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-gray-400 font-medium text-sm">
              {searchQuery || activeCategory !== 'Todos' ? 'Sin resultados' : 'No hay servicios'}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              {searchQuery
                ? 'Prueba con otra búsqueda.'
                : activeCategory !== 'Todos'
                ? 'No hay servicios en esta categoría.'
                : 'Agrega tu primer servicio al catálogo.'}
            </p>
          </div>
          {!searchQuery && activeCategory === 'Todos' && (
            <button
              onClick={openCreate}
              className="px-5 py-2 bg-[#FD8000] text-white text-sm font-semibold rounded-lg hover:bg-[#E57200] transition-colors"
            >
              + Nuevo Servicio
            </button>
          )}
        </div>
      )}

      {/* ── Grid view ── */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(service => {
            const margin = calcMargin(service, bepHourlyRate);
            const isConfirming = confirmDeleteId === service.id;
            return (
              <div
                key={service.id}
                className="bg-[#1C1C1C] rounded-xl border border-[#7F54F5]/20 flex flex-col"
              >
                {/* Card header */}
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[#FFCC00] font-semibold text-sm leading-tight flex-1 min-w-0 truncate">
                      {service.name}
                    </h3>
                    <MarginBadge margin={margin} />
                  </div>
                  <span className="inline-flex items-center self-start px-2 py-0.5 rounded text-[10px] font-bold bg-[#7F54F5]/20 text-[#7F54F5]">
                    {service.category}
                  </span>
                </div>

                {/* Description */}
                <div className="px-4 pb-4 flex-1">
                  <p className="text-gray-400 text-xs line-clamp-4 leading-relaxed">
                    {service.description || <span className="text-gray-600 italic">Sin descripción.</span>}
                  </p>
                </div>

                {/* Data footer */}
                <div className="px-4 py-3 border-t border-[#7F54F5]/10 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <Clock size={12} />
                    <span>{service.estimatedHours ?? '—'}h</span>
                  </div>
                  <span className="text-[#FFCC00] font-bold text-sm tabular-nums">
                    {formatCurrency(service.price)}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="px-3 py-2 border-t border-[#7F54F5]/10 flex items-center gap-1">
                  <button
                    onClick={() => openEdit(service)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded transition-colors"
                  >
                    <Pencil size={11} /> Editar
                  </button>
                  <button
                    onClick={() => handleDuplicate(service)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded transition-colors"
                  >
                    <Copy size={11} /> Duplicar
                  </button>
                  <div className="ml-auto">
                    {isConfirming ? (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => { handleDeleteService(service.id); setConfirmDeleteId(null); }}
                          className="p-1 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1 rounded text-gray-400 hover:bg-white/10 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(service.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      >
                        <Trash2 size={11} /> Quitar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── List view ── */}
      {viewMode === 'list' && filtered.length > 0 && (
        <div className="rounded-xl border border-[#7F54F5]/20 bg-[#1C1C1C] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-[#7F54F5]/10">
                  {['Servicio', 'Categoría', 'Horas', 'Margen', 'Precio', 'Acciones'].map(
                    (col, i) => (
                      <th
                        key={col}
                        className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 ${
                          i === 0 ? 'text-left' : i < 5 ? 'text-right' : 'text-right'
                        }`}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map(service => {
                  const margin = calcMargin(service, bepHourlyRate);
                  const isConfirming = confirmDeleteId === service.id;
                  return (
                    <tr
                      key={service.id}
                      className="border-b border-[#7F54F5]/10 last:border-0 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="text-gray-200 font-medium truncate">{service.name}</p>
                        <p className="text-gray-500 text-xs truncate mt-0.5">{service.description}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#7F54F5]/20 text-[#7F54F5]">
                          {service.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 tabular-nums">
                        {service.estimatedHours ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MarginBadge margin={margin} />
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#FFCC00] tabular-nums">
                        {formatCurrency(service.price)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isConfirming ? (
                            <>
                              <button
                                onClick={() => { handleDeleteService(service.id); setConfirmDeleteId(null); }}
                                className="p-1.5 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="p-1.5 rounded text-gray-400 hover:bg-white/10 transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => openEdit(service)}
                                className="p-1.5 rounded text-gray-500 hover:text-[#FFCC00] hover:bg-[#FFCC00]/10 transition-colors"
                                title="Editar"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDuplicate(service)}
                                className="p-1.5 rounded text-gray-500 hover:text-gray-200 hover:bg-white/10 transition-colors"
                                title="Duplicar"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(service.id)}
                                className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {modalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-[#1C1C1C] rounded-2xl border border-[#7F54F5]/20 w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#7F54F5]/20 shrink-0">
              <h2 className="text-sm font-semibold text-gray-100">
                {modalMode === 'create' ? 'Nuevo Servicio' : 'Editar Servicio'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Nombre
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Identidad Visual, Pack Redes…"
                  autoFocus
                  className={inputCls}
                />
              </div>

              {/* Category + Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Categoría
                  </label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className={inputCls}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Horas Estimadas
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.estimatedHours}
                    onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))}
                    placeholder="8"
                    className={inputCls + ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Descripción / Detalle
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe qué incluye este servicio…"
                  className="w-full bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors resize-none"
                />
              </div>

              {/* Margin */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Margen Objetivo (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={form.margin}
                  onChange={e => setForm(f => ({ ...f, margin: e.target.value }))}
                  placeholder="40"
                  className={inputCls + ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'}
                />
              </div>

              {/* Price calculator preview */}
              <div className="rounded-lg bg-[#111111] border-2 border-dashed border-[#7F54F5]/30 p-4 flex flex-col gap-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Calculadora de Precio
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Costo B.E.P.
                    {previewHours > 0 && (
                      <span className="text-gray-600 ml-1">
                        ({previewHours}h × {formatCurrency(bepHourlyRate)})
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-semibold text-gray-300 tabular-nums">
                    {previewHours > 0 ? formatCurrency(bepCost) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[#7F54F5]/10 pt-3">
                  <span className="text-xs text-gray-400">
                    Precio Sugerido
                    {previewMargin > 0 && (
                      <span className="text-gray-600 ml-1">({previewMargin}% margen)</span>
                    )}
                  </span>
                  <span className="text-lg font-bold text-[#FFCC00] tabular-nums">
                    {suggestedPrice > 0 ? formatCurrency(suggestedPrice) : '—'}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-gray-600 text-center">
                Ctrl+Enter guarda · Escape cierra
              </p>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#7F54F5]/20 shrink-0">
              <button
                onClick={closeModal}
                className="h-10 px-4 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="h-10 px-5 rounded-lg bg-[#FD8000] text-white text-sm font-semibold hover:bg-[#E57200] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
