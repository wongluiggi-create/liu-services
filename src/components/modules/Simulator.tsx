import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../App';

// ─── Helper ───────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v);

// ─── Component ────────────────────────────────────────────────────────────────

export default function SimulatorModule() {
  const { costsWithDepreciation, services } = useAppContext();

  const [mix, setMix] = useState<Record<string, number>>({});

  const updateMix = (serviceId: string, qty: number) =>
    setMix(prev => ({ ...prev, [serviceId]: Math.max(0, qty) }));

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalCosts = costsWithDepreciation.reduce((sum, c) => sum + c.amount, 0);
  const projectedRevenue = services.reduce((sum, s) => sum + s.price * (mix[s.id] || 0), 0);
  const balance = projectedRevenue - totalCosts;
  const isProfitable = balance >= 0;
  const progressPercentage = totalCosts > 0 ? Math.min((projectedRevenue / totalCosts) * 100, 100) : 0;

  // ── Empty state ───────────────────────────────────────────────────────────
  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 p-6">
        <div className="w-16 h-16 rounded-full bg-tech-card border border-tech-purple/20 flex items-center justify-center">
          <AlertTriangle size={24} className="text-tech-orange" />
        </div>
        <div className="text-center">
          <p className="text-gray-300 font-medium">Sin servicios para simular</p>
          <p className="text-gray-600 text-sm mt-1">
            Crea al menos un servicio en el catálogo para proyectar escenarios de venta.
          </p>
        </div>
        <Link
          to="/services"
          className="px-5 py-2 bg-tech-orange text-white text-sm font-semibold rounded-lg hover:bg-[#E57200] transition-colors"
        >
          Ir a Servicios
        </Link>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* 1. Meta */}
        <div className="bg-tech-card rounded-xl border border-tech-purple/20 border-l-4 border-l-tech-purple p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Meta (Costos Totales)
          </p>
          <p className="text-2xl font-bold text-gray-100 mt-1 tabular-nums">
            {formatCurrency(totalCosts)}
          </p>
          <p className="text-xs text-gray-500 mt-1">a cubrir este mes</p>
        </div>

        {/* 2. Ingreso Proyectado */}
        <div className="bg-tech-card rounded-xl border border-tech-purple/20 border-l-4 border-l-liu p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Ingreso Proyectado
          </p>
          <p className="text-2xl font-bold text-liu mt-1 tabular-nums">
            {formatCurrency(projectedRevenue)}
          </p>
          <p className="text-xs text-gray-500 mt-1">según mix actual</p>
        </div>

        {/* 3. Utilidad / Faltante */}
        {isProfitable ? (
          <div className="bg-tech-card rounded-xl border border-tech-purple/20 border-l-4 border-l-emerald-500 p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70">
              Utilidad Estimada
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
              {formatCurrency(balance)}
            </p>
            <p className="text-xs text-emerald-400/60 mt-1">sobre el punto de equilibrio</p>
          </div>
        ) : (
          <div className="bg-tech-card rounded-xl border border-tech-purple/20 border-l-4 border-l-red-500 p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-400/70">
              Faltante para Equilibrio
            </p>
            <p className="text-2xl font-bold text-red-400 mt-1 tabular-nums">
              {formatCurrency(Math.abs(balance))}
            </p>
            <p className="text-xs text-red-400/60 mt-1">bajo el punto de equilibrio</p>
          </div>
        )}
      </div>

      {/* ── Progress bar ── */}
      <div className="bg-tech-card rounded-xl border border-tech-purple/20 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-300">
            Progreso hacia el Punto de Equilibrio
          </span>
          <span
            className={`text-sm font-bold tabular-nums ${
              isProfitable ? 'text-emerald-400' : 'text-gray-300'
            }`}
          >
            {progressPercentage.toFixed(1)}%
          </span>
        </div>
        <div className="h-4 bg-tech-deep rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isProfitable ? 'bg-emerald-500' : 'bg-liu'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className={`text-xs mt-2 ${isProfitable ? 'text-emerald-400 font-medium' : 'text-gray-500'}`}>
          {isProfitable
            ? '¡Superaste el punto de equilibrio! Tu negocio es rentable con este mix.'
            : `Te faltan ${formatCurrency(Math.abs(balance))} para cubrir todos los costos.`}
        </p>
      </div>

      {/* ── Meta de Servicios del Mes ── */}
      <div className="bg-tech-card rounded-xl border border-tech-purple/20 overflow-hidden">
        <div className="px-5 py-4 border-b border-tech-purple/20">
          <h3 className="text-sm font-semibold text-gray-100">Meta de Servicios del Mes</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Servicios necesarios para cubrir todos los gastos. Ajusta las cantidades en el Escenario 2 para ver tu avance.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-tech-purple/10">
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Servicio</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Meta</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Llevo</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Faltan</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 min-w-35">Progreso</th>
              </tr>
            </thead>
            <tbody>
              {services.map(service => {
                const meta = service.price > 0 ? Math.ceil(totalCosts / service.price) : null;
                const llevo = mix[service.id] || 0;
                const faltan = meta !== null ? Math.max(0, meta - llevo) : null;
                const pct = meta !== null && meta > 0 ? Math.min((llevo / meta) * 100, 100) : 0;
                const done = faltan === 0;

                return (
                  <tr key={service.id} className="border-b border-tech-purple/10 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-gray-200 font-medium truncate max-w-45">{service.name}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">{formatCurrency(service.price)} / unidad</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-xl font-black text-liu tabular-nums">
                        {meta !== null ? meta : '∞'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xl font-black tabular-nums ${llevo > 0 ? 'text-gray-100' : 'text-gray-600'}`}>
                        {llevo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {done ? (
                        <CheckCircle2 size={20} className="text-emerald-400 mx-auto" />
                      ) : (
                        <span className="text-xl font-black text-red-400 tabular-nums">
                          {faltan !== null ? faltan : '∞'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2.5 bg-tech-deep rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-emerald-500' : 'bg-liu'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-[11px] font-bold tabular-nums w-9 text-right ${done ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-tech-purple/10 bg-tech-deep/40 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
            Progreso global del mix
          </span>
          <span className={`text-xs font-bold tabular-nums ${isProfitable ? 'text-emerald-400' : 'text-liu'}`}>
            {progressPercentage.toFixed(1)}% de la meta cubierta
          </span>
        </div>
      </div>

      {/* ── Scenario cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Escenario 1: Venta Única */}
        <div className="bg-tech-card rounded-xl border border-tech-purple/20 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-tech-purple/20 shrink-0">
            <h3 className="text-sm font-semibold text-gray-100">Escenario 1 — Venta Única</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Unidades de un solo servicio necesarias para cubrir todos los costos
            </p>
          </div>
          <div className="divide-y divide-tech-purple/10">
            {services.map(service => {
              const units = service.price > 0 ? Math.ceil(totalCosts / service.price) : null;
              return (
                <div
                  key={service.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-gray-200 truncate">{service.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatCurrency(service.price)} / unidad
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-3xl font-black text-liu tabular-nums leading-none">
                      {units !== null ? units.toLocaleString('es-CL') : '∞'}
                    </span>
                    <p className="text-[10px] text-gray-600 mt-0.5 uppercase tracking-wide">
                      {units === 1 ? 'unidad' : 'unidades'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Escenario 2: Mix de Ventas */}
        <div className="bg-tech-card rounded-xl border border-liu/40 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-liu/20 shrink-0">
            <h3 className="text-sm font-semibold text-gray-100">Escenario 2 — Mix de Ventas</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Ajusta cantidades para simular tu composición de ventas mensual
            </p>
          </div>
          <div className="divide-y divide-tech-purple/10">
            {services.map(service => {
              const qty = mix[service.id] || 0;
              const rowRevenue = service.price * qty;
              return (
                <div
                  key={service.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-gray-200 truncate">{service.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {qty > 0
                        ? `${formatCurrency(service.price)} × ${qty} = ${formatCurrency(rowRevenue)}`
                        : `${formatCurrency(service.price)} / unidad`}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={qty || ''}
                    onChange={e => updateMix(service.id, parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-20 h-9 bg-[#111111] border border-tech-purple/30 text-gray-100 rounded-lg px-3 text-sm text-right outline-none focus:ring-2 focus:ring-liu/50 focus:border-liu transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              );
            })}
          </div>

          {/* Mix footer */}
          <div className="px-5 py-3 border-t border-liu/20 flex items-center justify-between shrink-0 mt-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Total proyectado
            </span>
            <span
              className={`text-sm font-bold tabular-nums ${
                isProfitable ? 'text-emerald-400' : 'text-liu'
              }`}
            >
              {formatCurrency(projectedRevenue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
