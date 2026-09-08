// @ts-ignore
import _html2pdfModule from 'html2pdf.js';
import logoLiu from '../../assets/logo-liu.png';
import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Trash2, Check, Plus, ChevronDown, FileText, Download } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../App';
import { AgencyQuote, QuoteItem, QuoteStatus } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const html2pdf: any = (_html2pdfModule as any).default ?? _html2pdfModule;

// ─── Constants + helpers ──────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v);

const formatRut = (rut: string) => {
  if (!rut) return '';
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const verifier = clean.slice(-1);
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${verifier}`;
};

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
  'h-10 w-full bg-[#111111] border border-tech-purple/30 text-gray-100 rounded-lg px-3 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-liu/50 focus:border-liu transition-colors';

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
      if (!element) return;

      const safeName = (selectedClient?.name ?? 'cliente').replace(/\s+/g, '-');
      await html2pdf()
        .set({
          margin: 0,
          filename: `Cotizacion-${safeName}-${form.quoteDate}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(element)
        .save();
    } finally {
      setGenerating(false);
    }

    setForm(f => ({ ...f, quoteId, number, status: quote.status }));
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="grid lg:grid-cols-[1fr_2fr] min-h-full">

      {/* ══ LEFT PANEL — Quote list ══ */}
      <div className="border-b lg:border-b-0 lg:border-r border-tech-purple/20 flex flex-col">
        <div className="px-4 py-3 border-b border-tech-purple/20 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Cotizaciones ({quotes.length})
          </span>
          <button
            onClick={() => setForm(freshForm())}
            className="h-7 px-3 rounded-lg bg-tech-card border border-tech-purple/30 text-xs text-gray-300 hover:text-gray-100 hover:border-tech-purple/60 transition-colors flex items-center gap-1"
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
                    ? 'bg-tech-orange/10 border-tech-orange/30'
                    : 'bg-tech-card border-tech-purple/20 hover:border-tech-purple/50'
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
                  <span className="text-sm font-bold text-liu tabular-nums">
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
        <div className="p-4 md:p-6 flex flex-col gap-6 border-b border-tech-purple/20">

          {/* Form header with status */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-100">
              {form.quoteId ? `Editar ${form.number}` : 'Nueva Cotización'}
            </h2>
            <select
              value={form.status}
              onChange={e => setField('status', e.target.value as QuoteStatus)}
              className="h-8 text-xs bg-[#111111] border border-tech-purple/30 text-gray-300 rounded-lg px-2 outline-none focus:border-liu transition-colors"
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
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-tech-card border border-tech-purple/30 rounded-lg shadow-xl overflow-hidden">
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
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-tech-card border border-tech-purple/30 rounded-lg shadow-xl p-3">
                  <p className="text-xs text-gray-500">Sin resultados. </p>
                  <button
                    onMouseDown={() => navigate('/clients')}
                    className="text-xs text-tech-orange hover:underline mt-0.5"
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
                    className={inputCls + ' scheme-dark'}
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
              className="h-10 w-full bg-[#111111] border border-tech-purple/30 text-gray-400 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-liu/50 focus:border-liu transition-colors"
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
              <div className="rounded-lg border border-tech-purple/20 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-tech-purple/10 bg-tech-deep/40">
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Descripción</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium w-28">Precio Unit.</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium w-14">Cant.</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium w-24">Total</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map(item => (
                      <tr key={item.localId} className="border-b border-tech-purple/10 last:border-0">
                        <td className="px-3 py-2">
                          <input
                            value={item.name}
                            onChange={e => updateItem(item.localId, 'name', e.target.value)}
                            className="w-full bg-transparent text-gray-200 text-xs outline-none border-b border-transparent focus:border-liu/50 transition-colors"
                          />
                          <input
                            value={item.description}
                            onChange={e => updateItem(item.localId, 'description', e.target.value)}
                            placeholder="Descripción…"
                            className="w-full bg-transparent text-gray-500 text-[11px] outline-none border-b border-transparent focus:border-liu/30 transition-colors mt-0.5 placeholder:text-gray-700"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            value={item.price}
                            onChange={e => updateItem(item.localId, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent text-gray-200 text-xs text-right outline-none border-b border-transparent focus:border-liu/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={e => updateItem(item.localId, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-10 bg-transparent text-gray-200 text-xs text-right outline-none border-b border-transparent focus:border-liu/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-liu font-bold tabular-nums">
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
                    <tr className="border-t border-tech-purple/20 bg-tech-deep/40">
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
              className="h-10 w-full bg-[#111111] border border-tech-purple/30 text-gray-300 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-liu/50 focus:border-liu transition-colors"
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
              className="w-full bg-[#111111] border border-tech-purple/30 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-liu/50 focus:border-liu transition-colors resize-none"
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSaveAndDownload}
            disabled={!form.selectedClientId || form.items.length === 0 || generating}
            className="h-11 w-full rounded-lg bg-tech-orange text-white text-sm font-semibold hover:bg-[#E57200] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Download size={15} />
            {generating ? 'Generando PDF…' : 'Guardar y Descargar PDF'}
          </button>
        </div>

        {/* ══ QUOTE PREVIEW ══ */}
        <div className="p-4 md:p-6 overflow-x-auto">

          {/* Toolbar (solo en pantalla) */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Vista previa del documento
            </span>
            <button
              onClick={handleSaveAndDownload}
              disabled={!form.selectedClientId || form.items.length === 0 || generating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-tech-orange text-white text-xs font-semibold rounded-lg hover:bg-[#E57200] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={12} /> {generating ? 'Generando…' : 'Descargar PDF'}
            </button>
          </div>

          {/* ── Documento A4 ── */}
          <div
            id="quote-preview"
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              backgroundColor: '#ffffff',
              color: '#1a1a1a',
              width: '794px',
              minHeight: '1000px',
              margin: '0 auto',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            {/* Franja superior naranja */}
            <div style={{ backgroundColor: '#FD8000', height: '6px', width: '100%' }} />

            <div style={{ padding: '44px 52px 40px' }}>

              {/* ── CABECERA: logo ← → info agencia ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
                <div>
                  <img
                    src={settings.logoUrl || logoLiu}
                    alt="Logo"
                    style={{ height: '56px', objectFit: 'contain', display: 'block' }}
                  />
                </div>
                <div style={{ textAlign: 'right' }}>
                  {settings.agencyName && <p style={{ fontWeight: 700, fontSize: '13px', color: '#111', margin: '0 0 3px' }}>{settings.agencyName}</p>}
                  {settings.rut        && <p style={{ fontSize: '11px', color: '#666', margin: '1px 0' }}>RUT: {formatRut(settings.rut)}</p>}
                  {settings.address    && <p style={{ fontSize: '11px', color: '#666', margin: '1px 0' }}>{settings.address}</p>}
                  {settings.email      && <p style={{ fontSize: '11px', color: '#666', margin: '1px 0' }}>{settings.email}</p>}
                </div>
              </div>

              {/* ── TÍTULO COTIZACIÓN + N° + FECHAS ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #FD8000', paddingBottom: '14px', marginBottom: '28px' }}>
                <div>
                  <h1 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px', color: '#111', margin: '0 0 2px' }}>COTIZACIÓN</h1>
                  <p style={{ fontSize: '13px', color: '#888', fontFamily: 'monospace', margin: 0 }}>N° {form.number || nextNumber()}</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#555', lineHeight: '1.7' }}>
                  <p style={{ margin: 0 }}><strong style={{ color: '#444' }}>Fecha:</strong> {formatDate(form.quoteDate)}</p>
                  {form.validUntil   && <p style={{ margin: 0 }}><strong style={{ color: '#444' }}>Válido hasta:</strong> {formatDate(form.validUntil)}</p>}
                  {form.deliveryDate && <p style={{ margin: 0 }}><strong style={{ color: '#444' }}>Entrega:</strong> {formatDate(form.deliveryDate)}</p>}
                </div>
              </div>

              {/* ── BLOQUE PARA ── */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ padding: '16px 18px', backgroundColor: '#fafafa', borderRadius: '6px', borderLeft: '3px solid #FD8000' }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#bbb', margin: '0 0 8px' }}>Para</p>
                  {selectedClient ? (
                    <>
                      <p style={{ fontWeight: 700, fontSize: '14px', color: '#111', margin: '0 0 4px' }}>{selectedClient.name}</p>
                      {selectedClient.rut     && <p style={{ fontSize: '11px', color: '#666', margin: '2px 0' }}>RUT: {formatRut(selectedClient.rut)}</p>}
                      {selectedClient.email   && <p style={{ fontSize: '11px', color: '#666', margin: '2px 0' }}>{selectedClient.email}</p>}
                      {selectedClient.address && <p style={{ fontSize: '11px', color: '#666', margin: '2px 0' }}>{selectedClient.address}</p>}
                    </>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#bbb', fontStyle: 'italic', margin: 0 }}>Sin cliente seleccionado</p>
                  )}
                </div>
              </div>

              {/* ── TABLA DE SERVICIOS ── */}
              {form.items.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#111111', color: '#ffffff' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: '11px', letterSpacing: '0.3px' }}>Descripción</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: '11px', width: '130px' }}>P. Unitario</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: '11px', width: '60px' }}>Cant.</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: '11px', width: '120px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, i) => (
                      <tr key={item.localId} style={{ backgroundColor: i % 2 === 0 ? '#fafafa' : '#ffffff', borderBottom: '1px solid #eeeeee' }}>
                        <td style={{ padding: '11px 14px', verticalAlign: 'top' }}>
                          <p style={{ fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{item.name}</p>
                          {item.description && (
                            <p style={{ fontSize: '10px', color: '#888', margin: '3px 0 0', lineHeight: '1.5' }}>{item.description}</p>
                          )}
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', color: '#555', verticalAlign: 'top', fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(item.price)}
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', color: '#555', verticalAlign: 'top' }}>
                          {item.quantity}
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#1a1a1a', verticalAlign: 'top', fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ border: '2px dashed #e5e5e5', borderRadius: '8px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}>
                  <p style={{ color: '#bbb', fontSize: '13px', margin: 0 }}>Agrega servicios para visualizar la tabla</p>
                </div>
              )}

              {/* ── TOTALES ── */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '36px' }}>
                <div style={{ width: '260px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #eeeeee', fontSize: '13px', color: '#666' }}>
                    <span>Subtotal</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #eeeeee', fontSize: '13px', color: '#666' }}>
                    <span>IVA (19%)</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(tax)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', marginTop: '6px', backgroundColor: '#111111', borderRadius: '6px', fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                    <span>Total con IVA</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalWithIVA)}</span>
                  </div>
                </div>
              </div>

              {/* ── TÉRMINOS Y CONDICIONES ── */}
              {form.terms && (
                <div style={{ borderTop: '1px solid #eeeeee', paddingTop: '18px', marginBottom: '24px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#bbb', margin: '0 0 8px' }}>
                    Términos y Condiciones
                  </p>
                  <p style={{ fontSize: '10px', color: '#888', lineHeight: '1.3', whiteSpace: 'pre-line', margin: 0 }}>
                    {form.terms}
                  </p>
                </div>
              )}

              {/* ── PIE DE PÁGINA ── */}
              <div style={{ borderTop: '2px solid #FD8000', paddingTop: '14px', textAlign: 'center', fontSize: '11px', color: '#aaa' }}>
                {[settings.agencyName, settings.email, settings.address].filter(Boolean).join('  ·  ')}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
