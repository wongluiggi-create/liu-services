import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { useAppContext } from '../../App';
import Card from '../ui/Card';
import { CostType } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const GRID_STROKE = '#7F54F5';

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#111111',
  border: '1px solid rgba(127, 84, 245, 0.3)',
  borderRadius: '8px',
  color: '#F0F0F0',
  fontSize: '12px',
};

const AXIS_TICK = { fill: '#6B7280', fontSize: 11 };

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(v);

const formatShort = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { costsWithDepreciation, settings, monthlySales, setMonthlySales } = useAppContext();

  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();
  const capacityHours = settings.capacityHours || 160;

  const totalMonthlyCosts = costsWithDepreciation.reduce((sum, c) => sum + c.amount, 0);
  const totalFixed = costsWithDepreciation
    .filter(c => c.type === CostType.FIXED)
    .reduce((sum, c) => sum + c.amount, 0);

  const bepRate = capacityHours > 0 ? totalMonthlyCosts / capacityHours : 0;

  // ─── Monthly sales helpers ────────────────────────────────────────────────

  const monthKey = (i: number) => `${currentYear}-${String(i + 1).padStart(2, '0')}`;

  const getMonthValue = (i: number) =>
    monthlySales.find(s => s.month === monthKey(i))?.amount ?? 0;

  const setMonthValue = (i: number, raw: string) => {
    const value = parseFloat(raw) || 0;
    const key = monthKey(i);
    setMonthlySales(prev => {
      const rest = prev.filter(s => s.month !== key);
      return value > 0 ? [...rest, { month: key, amount: value }] : rest;
    });
  };

  const annualTotal = MONTHS.reduce((sum, _, i) => sum + getMonthValue(i), 0);

  // ─── Chart data ───────────────────────────────────────────────────────────

  const barData = MONTHS_SHORT.map((month, i) => ({
    month,
    Ingresos: getMonthValue(i),
    Egresos: totalMonthlyCosts,
  }));

  const BEP_STEPS = 10;
  const bepData = Array.from({ length: BEP_STEPS + 1 }, (_, i) => {
    const hours = (i * capacityHours) / BEP_STEPS;
    return {
      hours: Math.round(hours),
      Ventas: Math.round(hours * bepRate),
      Costos: Math.round(totalFixed),
    };
  });

  // ─── Matrix ───────────────────────────────────────────────────────────────

  const annualEgress = totalMonthlyCosts * 12;
  const annualProfit = annualTotal - annualEgress;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">

      {/* ── Section 1: Monthly sales grid ── */}
      <Card noPadding>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#7F54F5]/20">
          <h2 className="text-sm font-semibold text-gray-100">
            Ventas {currentYear}
          </h2>
          <span className="text-sm font-bold text-[#FFCC00]">
            {formatCurrency(annualTotal)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
          {MONTHS.map((month, i) => {
            const isActive = i === currentMonthIndex;
            return (
              <div
                key={month}
                className={`rounded-lg border p-2 flex flex-col gap-1 ${
                  isActive
                    ? 'border-[#FFCC00] bg-[#FFCC00]/10'
                    : 'border-[#7F54F5]/20 bg-[#111111]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {month.slice(0, 3)}
                  </span>
                  {isActive && (
                    <span className="text-[9px] font-black bg-[#FFCC00] text-[#111111] rounded px-1 leading-4">
                      HOY
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  value={getMonthValue(i) || ''}
                  onChange={e => setMonthValue(i, e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-right text-sm font-semibold text-gray-100 placeholder:text-gray-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Section 2: Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Bar chart: Cash flow */}
        <Card noPadding>
          <div className="px-5 py-4 border-b border-[#7F54F5]/20">
            <h2 className="text-sm font-semibold text-gray-100">Flujo de Caja Proyectado</h2>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barCategoryGap="30%" barGap={2}>
                <CartesianGrid
                  stroke={GRID_STROKE}
                  strokeOpacity={0.2}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatShort}
                  width={52}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  formatter={(value) => [formatCurrency(Number(value))]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
                <Bar dataKey="Ingresos" fill="#FFCC00" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Egresos" fill="#FD8000" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Line chart: Break-even */}
        <Card noPadding>
          <div className="px-5 py-4 border-b border-[#7F54F5]/20">
            <h2 className="text-sm font-semibold text-gray-100">
              Punto de Equilibrio (Break-Even)
            </h2>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bepData}>
                <CartesianGrid
                  stroke={GRID_STROKE}
                  strokeOpacity={0.2}
                  vertical={false}
                />
                <XAxis
                  dataKey="hours"
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: 'Horas',
                    position: 'insideBottomRight',
                    offset: -4,
                    fill: '#6B7280',
                    fontSize: 10,
                  }}
                />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatShort}
                  width={52}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [formatCurrency(Number(value))]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
                <ReferenceLine
                  y={totalFixed}
                  stroke="#7F54F5"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Fijos',
                    position: 'insideTopRight',
                    fill: '#7F54F5',
                    fontSize: 10,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Ventas"
                  stroke="#FFCC00"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#FFCC00' }}
                />
                <Line
                  type="monotone"
                  dataKey="Costos"
                  stroke="#FD8000"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#FD8000' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Section 3: Annual matrix table ── */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-[#7F54F5]/20">
          <h2 className="text-sm font-semibold text-gray-100">Matriz Anual</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="border-b border-[#7F54F5]/10">
                <th className="sticky left-0 z-10 bg-[#1C1C1C] text-left px-4 py-3 text-gray-400 font-medium w-28">
                  Concepto
                </th>
                {MONTHS_SHORT.map(m => (
                  <th key={m} className="px-2 py-3 text-right text-gray-400 font-medium whitespace-nowrap">
                    {m}
                  </th>
                ))}
                <th className="px-3 py-3 text-right text-gray-400 font-medium bg-[#FFCC00]/5 whitespace-nowrap">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Ingresos */}
              <tr className="border-b border-[#7F54F5]/10 hover:bg-white/5 transition-colors">
                <td className="sticky left-0 z-10 bg-[#1C1C1C] px-4 py-3 text-gray-200 font-medium">
                  Ingresos
                </td>
                {MONTHS.map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-gray-300 tabular-nums">
                    {formatCurrency(getMonthValue(i))}
                  </td>
                ))}
                <td className="px-3 py-3 text-right font-semibold text-[#FFCC00] bg-[#FFCC00]/10 tabular-nums">
                  {formatCurrency(annualTotal)}
                </td>
              </tr>

              {/* Egresos */}
              <tr className="border-b border-[#7F54F5]/10 hover:bg-white/5 transition-colors">
                <td className="sticky left-0 z-10 bg-[#1C1C1C] px-4 py-3 text-red-400 font-medium">
                  Egresos
                </td>
                {MONTHS.map((_, i) => (
                  <td key={i} className="px-2 py-3 text-right text-red-400/80 tabular-nums">
                    {formatCurrency(totalMonthlyCosts)}
                  </td>
                ))}
                <td className="px-3 py-3 text-right font-semibold text-red-400 bg-[#FFCC00]/10 tabular-nums">
                  {formatCurrency(annualEgress)}
                </td>
              </tr>

              {/* Utilidad */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="sticky left-0 z-10 bg-[#1C1C1C] px-4 py-3 text-gray-200 font-medium">
                  Utilidad
                </td>
                {MONTHS.map((_, i) => {
                  const profit = getMonthValue(i) - totalMonthlyCosts;
                  return (
                    <td
                      key={i}
                      className={`px-2 py-3 text-right tabular-nums font-medium ${
                        profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {formatCurrency(profit)}
                    </td>
                  );
                })}
                <td
                  className={`px-3 py-3 text-right font-semibold bg-[#FFCC00]/10 tabular-nums ${
                    annualProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(annualProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
