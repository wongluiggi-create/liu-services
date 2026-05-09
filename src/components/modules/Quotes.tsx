// @ts-ignore
import html2pdf from 'html2pdf.js';
import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Trash2, Check, Plus, ChevronDown, FileText, Download } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../App';
import { AgencyQuote, QuoteItem, QuoteStatus } from '../../types';

// ─── Constants + helpers ──────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v);

const formatDate = (s: string) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

const today = () => new Date().toISOString().split('T')[0];
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0];

const STATUS_CONFIG: Record<QuoteStatus, { label: string; textCls: string; bgCls: string }> = {
  draft:    { label: 'Borrador',  textCls: 'text-gray-400',    bgCls: 'bg-gray-400/20' },
  sent:     { label: 'Enviado',   textCls: 'text-[#7F54F5]',   bgCls: 'bg-[#7F54F5]/20' },
  accepted: { label: 'Aprobado',  textCls: 'text-emerald-400', bgCls: 'bg-emerald-400/20' },
  rejected: { label: 'Rechazado', textCls: 'text-red-400',     bgCls: 'bg-red-400/20' },
};

function StatusBadge({ status }: { status: QuoteStatus }) {
  const { label, textCls, bgCls } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${bgCls} ${textCls}`}>
      {label}
    </span>
  );
}

// ─── Form types ───────────────────────────────────────────────────────────────

interface FormItem extends QuoteItem {
  localId: string;
}

interface QuoteForm {
  quoteId: string | null;
  number: string;
  selectedClientId: string;
  clientSearch: string;
  showClientDropdown: boolean;
  items: FormItem[];
  quoteDate: string;
  validUntil: string;
  deliveryDate: string;
  activeTemplateId: string;
  terms: string;
  status: QuoteStatus;
}

const freshForm = (): QuoteForm => ({
  quoteId: null,
  number: '',
  selectedClientId: '',
  clientSearch: '',
  showClientDropdown: false,
  items: [],
  quoteDate: today(),
  validUntil: plusDays(15),
  deliveryDate: '',
  activeTemplateId: '',
  terms: '',
  status: 'draft',
});

const inputCls =
  'h-10 w-full bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg px-3 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors';

const labelCls = 'text-[10px] font-bold uppercase tracking-wider text-gray-400';

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuotesModule() {
  const {
    clients, services, quotes, setQuotes,
    settings, termTemplates,
  } = useAppContext();
  const navigate = useNavigate();

  const [form, setForm] = useState<QuoteForm>(freshForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  // ── Sorted quote list ─────────────────────────────────────────────────────
  const sortedQuotes = useMemo(
    () => [...quotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [quotes]
  );

  // ── Client search dropdown ────────────────────────────────────────────────
  const filteredClients = useMemo(() => {
    if (!form.clientSearch.trim()) return [];
    const q = form.clientSearch.toLowerCase();
    return clients
      .filter(c => c.name.toLowerCase().includes(q) || (c.rut ?? '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [clients, form.clientSearch]);

  const selectedClient = clients.find(c => c.id === form.selectedClientId) ?? null;

  // ── Derived ───────────────────────────────────────────────────────────────
  const subtotal = form.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * 0.19;
  const totalWithIVA = subtotal * 1.19;

  const nextNumber = () => {
    const yr = new Date().getFullYear();
    return `COT-${yr}-${String(quotes.length + 1).padStart(3, '0')}`;
  };

  // ── Click outside dropdown ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setForm(f => ({ ...f, showClientDropdown: false }));
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const setField = <K extends keyof QuoteForm>(key: K, value: QuoteForm[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const selectClient = (clientId: string, clientName: string) => {
    setForm(f => ({ ...f, selectedClientId: clientId, clientSearch: clientName, showClientDropdown: false }));
  };

  const addServiceItem = (serviceId: string) => {
    if (!serviceId) return;
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;
    setForm(f => ({
      ...f,
      items: [
        ...f.items,
        { localId: uuidv4(), serviceId: svc.id, name: svc.name, description: svc.description, price: svc.price, quantity: 1 },
      ],
    }));
  };

  const updateItem = (localId: string, field: keyof Omit<FormItem, 'localId'>, value: string | number) =>
    setForm(f => ({
      ...f,
      items: f.items.map(item => item.localId === localId ? { ...item, [field]: value } : item),
    }));

  const removeItem = (localId: string) =>
    setForm(f => ({ ...f, items: f.items.filter(item => item.localId !== localId) }));

  const handleLoadQuote = (quote: AgencyQuote) => {
    const client = clients.find(c => c.id === quote.clientId);
    setForm({
      quoteId: quote.id,
      number: quote.number,
      selectedClientId: quote.clientId,
      clientSearch: client?.name ?? '',
      showClientDropdown: false,
      items: quote.items.map(item => ({ ...item, localId: uuidv4() })),
      quoteDate: quote.createdAt.split('T')[0],
      validUntil: quote.validUntil ?? '',
      deliveryDate: quote.deliveryDate ?? '',
      activeTemplateId: '',
      terms: quote.terms ?? '',
      status: quote.status,
    });
  };

  const handleDeleteQuote = (id: string) => {
    setQuotes(prev => prev.filter(q => q.id !== id));
    setConfirmDeleteId(null);
    if (form.quoteId === id) setForm(freshForm());
  };

  const handleSaveAndDownload = async () => {
    if (!form.selectedClientId || form.items.length === 0 || generating) return;
    setGenerating(true);

    const quoteId = form.quoteId ?? uuidv4();
    const number = form.number || nextNumber();

    const savedItems: QuoteItem[] = form.items.map(({ localId: _l, ...rest }) => rest);

    const quote: AgencyQuote = {
      id: quoteId,
      number,
      clientId: form.selectedClientId,
      items: savedItems,
      subtotal,
      tax,
      total: totalWithIVA,
      status: form.status,
      createdAt: form.quoteDate ? `${form.quoteDate}T00:00:00.000Z` : new Date().toISOString(),
      validUntil: form.validUntil || undefined,
      deliveryDate: form.deliveryDate || undefined,
      terms: form.terms || undefined,
    };

    setQuotes(prev =>
      prev.some(q => q.id === quoteId)
        ? prev.map(q => (q.id === quoteId ? quote : q))
        : [...prev, quote]
    );

    // Generate PDF
    try {
      const element = document.getElementById('quote-preview');
      if (element) {
        const hiddenEls = Array.from(element.querySelectorAll<HTMLElement>('[data-pdf-hide]'));
        hiddenEls.forEach(el => { el.style.display = 'none'; });

        const safeName = (selectedClient?.name ?? 'cliente').replace(/\s+/g, '-');
        await html2pdf()
          .set({
            margin: 0,
            filename: `Cotizacion-${safeName}-${form.quoteDate}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          })
          .from(element)
          .save();

        hiddenEls.forEach(el => { el.style.display = ''; });
      }
    } finally {
      setGenerating(false);
    }

    setForm(f => ({ ...f, quoteId, number, status: quote.status }));
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="grid lg:grid-cols-[1fr_2fr] min-h-full">

      {/* ══ LEFT PANEL — Quote list ══ */}
      <div className="border-b lg:border-b-0 lg:border-r border-[#7F54F5]/20 flex flex-col">
        <div className="px-4 py-3 border-b border-[#7F54F5]/20 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Cotizaciones ({quotes.length})
          </span>
          <button
            onClick={() => setForm(freshForm())}
            className="h-7 px-3 rounded-lg bg-[#1C1C1C] border border-[#7F54F5]/30 text-xs text-gray-300 hover:text-gray-100 hover:border-[#7F54F5]/60 transition-colors flex items-center gap-1"
          >
            <Plus size={11} /> Nueva
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {sortedQuotes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <FileText size={24} className="text-gray-700" />
              <p className="text-gray-600 text-xs">Aún no hay cotizaciones.</p>
            </div>
          )}

          {sortedQuotes.map(quote => {
            const clientName = clients.find(c => c.id === quote.clientId)?.name ?? 'Sin cliente';
            const isActive = form.quoteId === quote.id;
            const isConfirming = confirmDeleteId === quote.id;

            return (
              <div
                key={quote.id}
                onClick={() => handleLoadQuote(quote)}
                className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                  isActive
                    ? 'bg-[#FD8000]/10 border-[#FD8000]/30'
                    : 'bg-[#1C1C1C] border-[#7F54F5]/20 hover:border-[#7F54F5]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{clientName}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{formatDate(quote.createdAt.split('T')[0])}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusBadge status={quote.status} />
                    {isConfirming ? (
                      <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteQuote(quote.id)}
                          className="p-1 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1 rounded text-gray-400 hover:bg-white/10 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(quote.id); }}
                        className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-gray-600 font-mono">{quote.number}</span>
                  <span className="text-sm font-bold text-[#FFCC00] tabular-nums">
                    {formatCurrency(quote.total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ RIGHT PANEL — Form + Preview ══ */}
      <div className="flex flex-col">

        {/* ── Form area ── */}
        <div className="p-4 md:p-6 flex flex-col gap-6 border-b border-[#7F54F5]/20">

          {/* Form header with status */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-100">
              {form.quoteId ? `Editar ${form.number}` : 'Nueva Cotización'}
            </h2>
            <select
              value={form.status}
              onChange={e => setField('status', e.target.value as QuoteStatus)}
              className="h-8 text-xs bg-[#111111] border border-[#7F54F5]/30 text-gray-300 rounded-lg px-2 outline-none focus:border-[#FFCC00] transition-colors"
            >
              <option value="draft">Borrador</option>
              <option value="sent">Enviado</option>
              <option value="accepted">Aprobado</option>
              <option value="rejected">Rechazado</option>
            </select>
          </div>

          {/* ─ Sección A: Cliente + fechas ─ */}
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">A — Cliente</p>

            {/* Client search */}
            <div ref={clientRef} className="relative">
              <label className={labelCls}>Cliente</label>
              <div className="relative mt-1">
                <input
                  value={form.clientSearch}
                  onChange={e => setForm(f => ({ ...f, clientSearch: e.target.value, selectedClientId: '', showClientDropdown: true }))}
                  onFocus={() => setField('showClientDropdown', true)}
                  placeholder="Buscar cliente por nombre o RUT…"
                  className={inputCls + ' pr-8'}
                />
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>

              {/* Dropdown */}
              {form.showClientDropdown && filteredClients.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-[#1C1C1C] border border-[#7F54F5]/30 rounded-lg shadow-xl overflow-hidden">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      onMouseDown={() => selectClient(c.id, c.name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="text-gray-200 font-medium truncate">{c.name}</span>
                      {c.rut && <span className="text-gray-500 text-xs font-mono shrink-0">{c.rut}</span>}
                    </button>
                  ))}
                </div>
              )}

              {form.showClientDropdown && form.clientSearch.trim() && filteredClients.length === 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-[#1C1C1C] border border-[#7F54F5]/30 rounded-lg shadow-xl p-3">
                  <p className="text-xs text-gray-500">Sin resultados. </p>
                  <button
                    onMouseDown={() => navigate('/clients')}
                    className="text-xs text-[#FD8000] hover:underline mt-0.5"
                  >
                    + Crear cliente
                  </button>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { label: 'Fecha Cotización', key: 'quoteDate' as const },
                { label: 'Validez Hasta', key: 'validUntil' as const },
                { label: 'Fecha Entrega', key: 'deliveryDate' as const },
              ]).map(({ label, key }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className={labelCls}>{label}</label>
                  <input
                    type="date"
                    value={form[key]}
                    onChange={e => setField(key, e.target.value)}
                    className={inputCls + ' [color-scheme:dark]'}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ─ Sección B: Servicios ─ */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">B — Servicios</p>

            {/* Service selector */}
            <select
              value=""
              onChange={e => addServiceItem(e.target.value)}
              className="h-10 w-full bg-[#111111] border border-[#7F54F5]/30 text-gray-400 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors"
            >
              <option value="" disabled>+ Agregar servicio del catálogo…</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatCurrency(s.price)}
                </option>
              ))}
            </select>

            {/* Items table */}
            {form.items.length > 0 && (
              <div className="rounded-lg border border-[#7F54F5]/20 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#7F54F5]/10 bg-[#0D0D0D]/40">
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Descripción</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium w-28">Precio Unit.</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium w-14">Cant.</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium w-24">Total</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map(item => (
                      <tr key={item.localId} className="border-b border-[#7F54F5]/10 last:border-0">
                        <td className="px-3 py-2">
                          <input
                            value={item.name}
                            onChange={e => updateItem(item.localId, 'name', e.target.value)}
                            className="w-full bg-transparent text-gray-200 text-xs outline-none border-b border-transparent focus:border-[#FFCC00]/50 transition-colors"
                          />
                          <input
                            value={item.description}
                            onChange={e => updateItem(item.localId, 'description', e.target.value)}
                            placeholder="Descripción…"
                            className="w-full bg-transparent text-gray-500 text-[11px] outline-none border-b border-transparent focus:border-[#FFCC00]/30 transition-colors mt-0.5 placeholder:text-gray-700"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            value={item.price}
                            onChange={e => updateItem(item.localId, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent text-gray-200 text-xs text-right outline-none border-b border-transparent focus:border-[#FFCC00]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={e => updateItem(item.localId, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-10 bg-transparent text-gray-200 text-xs text-right outline-none border-b border-transparent focus:border-[#FFCC00]/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-[#FFCC00] font-bold tabular-nums">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                        <td className="pr-2 py-2">
                          <button
                            onClick={() => removeItem(item.localId)}
                            className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[#7F54F5]/20 bg-[#0D0D0D]/40">
                      <td colSpan={3} className="px-3 py-2 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                        Subtotal
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-gray-200 tabular-nums">
                        {formatCurrency(subtotal)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ─ Sección C: Términos ─ */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">C — Términos y Condiciones</p>
            <select
              value={form.activeTemplateId}
              onChange={e => {
                const tmpl = termTemplates.find(t => t.id === e.target.value);
                setForm(f => ({ ...f, activeTemplateId: e.target.value, terms: tmpl?.content ?? f.terms }));
              }}
              className="h-10 w-full bg-[#111111] border border-[#7F54F5]/30 text-gray-300 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors"
            >
              <option value="">Seleccionar plantilla…</option>
              {termTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <textarea
              rows={5}
              value={form.terms}
              onChange={e => setField('terms', e.target.value)}
              placeholder="Términos y condiciones de la cotización…"
              className="w-full bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors resize-none"
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSaveAndDownload}
            disabled={!form.selectedClientId || form.items.length === 0 || generating}
            className="h-11 w-full rounded-lg bg-[#FD8000] text-white text-sm font-semibold hover:bg-[#E57200] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Download size={15} />
            {generating ? 'Generando PDF…' : 'Guardar y Descargar PDF'}
          </button>
        </div>

        {/* ══ QUOTE PREVIEW ══ */}
        <div className="p-4 md:p-6">
          <div
            id="quote-preview"
            className="bg-white rounded-xl text-gray-800 overflow-hidden shadow-xl"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {/* PDF action buttons (hidden in output) */}
            <div data-pdf-hide className="bg-gray-50 px-6 py-3 flex items-center justify-between border-b border-gray-200">
              <span className="text-xs text-gray-400 font-mono">VISTA PREVIA DEL DOCUMENTO</span>
              <button
                onClick={handleSaveAndDownload}
                disabled={!form.selectedClientId || form.items.length === 0 || generating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FD8000] text-white text-xs font-semibold rounded-lg hover:bg-[#E57200] transition-colors disabled:opacity-40"
              >
                <Download size={12} /> {generating ? '…' : 'Descargar PDF'}
              </button>
            </div>

            <div className="p-8 md:p-10">
              {/* ── Preview header ── */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      className="h-14 object-contain mb-1"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="h-14 w-14 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 text-xs">Logo</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <h1 className="text-lg font-bold text-gray-900">{settings.agencyName || 'Liu Agency'}</h1>
                  {settings.rut && <p className="text-sm text-gray-500">RUT: {settings.rut}</p>}
                  {settings.address && <p className="text-sm text-gray-500">{settings.address}</p>}
                  {settings.email && <p className="text-sm text-gray-500">{settings.email}</p>}
                </div>
              </div>

              {/* ── Quote title block ── */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">COTIZACIÓN</h2>
                  <span className="text-lg font-mono text-gray-600">
                    {form.number || nextNumber()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3 text-sm text-gray-500">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 block">Fecha</span>
                    {formatDate(form.quoteDate)}
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 block">Válido hasta</span>
                    {form.validUntil ? formatDate(form.validUntil) : '—'}
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 block">Entrega</span>
                    {form.deliveryDate ? formatDate(form.deliveryDate) : '—'}
                  </div>
                </div>
              </div>

              {/* ── Client block ── */}
              {selectedClient ? (
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Para:</p>
                  <p className="font-bold text-gray-900 text-base">{selectedClient.name}</p>
                  {selectedClient.rut && <p className="text-sm text-gray-500">RUT: {selectedClient.rut}</p>}
                  {selectedClient.email && <p className="text-sm text-gray-500">{selectedClient.email}</p>}
                  {selectedClient.address && <p className="text-sm text-gray-500">{selectedClient.address}</p>}
                </div>
              ) : (
                <div className="mb-6 h-20 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400 text-sm">Selecciona un cliente para ver los datos aquí</p>
                </div>
              )}

              {/* ── Services table ── */}
              {form.items.length > 0 ? (
                <table className="w-full mb-6 text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-2 text-gray-600 font-semibold">Descripción</th>
                      <th className="text-right py-2 text-gray-600 font-semibold w-32">P. Unitario</th>
                      <th className="text-right py-2 text-gray-600 font-semibold w-16">Cant.</th>
                      <th className="text-right py-2 text-gray-600 font-semibold w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, i) => (
                      <tr key={item.localId} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-gray-800">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
                          )}
                        </td>
                        <td className="py-2.5 text-right text-gray-600 tabular-nums">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="py-2.5 text-right text-gray-600 tabular-nums">{item.quantity}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-800 tabular-nums">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="mb-6 h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400 text-sm">Agrega servicios para visualizar la tabla</p>
                </div>
              )}

              {/* ── Totals ── */}
              <div className="flex justify-end mb-8">
                <div className="w-52 flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal:</span>
                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>IVA (19%):</span>
                    <span className="tabular-nums">{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 border-t-2 border-gray-200 pt-2 mt-0.5">
                    <span>Total con IVA:</span>
                    <span className="tabular-nums">{formatCurrency(totalWithIVA)}</span>
                  </div>
                </div>
              </div>

              {/* ── Terms ── */}
              {form.terms && (
                <div className="border-t border-gray-200 pt-6 mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    Términos y Condiciones
                  </p>
                  <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{form.terms}</p>
                </div>
              )}

              {/* ── Footer ── */}
              <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
                {[settings.agencyName, settings.email, settings.address].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
