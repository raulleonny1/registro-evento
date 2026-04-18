"use client";

import Link from "next/link";
import { useState } from "react";

export function RegistroNuevoPrivacidad() {
  const [acepta, setAcepta] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/40 dark:text-amber-50">
        <p className="font-semibold text-amber-900 dark:text-amber-100">
          Uso de tus datos personales (RGPD)
        </p>
        <p className="mt-2 text-amber-950/95 dark:text-amber-50/95">
          Los datos que vas a indicar en el siguiente paso se tratan únicamente para gestionar tu
          inscripción y tu participación en el{" "}
          <span className="font-medium">
            Encuentro Nacional de Mujeres IERE (25 al 27 de septiembre de 2026)
          </span>
          . No se emplearán para otros fines (por ejemplo, publicidad o comunicaciones no ligadas a
          este evento) sin un consentimiento aparte.
        </p>
        <p className="mt-3 text-amber-950/95 dark:text-amber-50/95">
          La base jurídica es tu consentimiento (art. 6.1.a del Reglamento General de Protección de
          Datos). Puedes ejercer los derechos que reconoce la normativa europea (acceso,
          rectificación, supresión, limitación, portabilidad u oposición) contactando a la
          organización del encuentro.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-4 text-sm leading-snug text-zinc-800 transition hover:border-rose-200/80 dark:border-zinc-600/80 dark:bg-zinc-800/50 dark:text-zinc-200 dark:hover:border-rose-500/40">
        <input
          type="checkbox"
          checked={acepta}
          onChange={(e) => setAcepta(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-rose-600 focus:ring-rose-500 dark:border-zinc-500 dark:bg-zinc-900"
        />
        <span>
          He leído la información anterior y consiento el tratamiento de mis datos para la gestión
          de mi participación en este evento.
        </span>
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/registro"
          className="touch-manipulation order-2 inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold text-zinc-600 ring-1 ring-zinc-200/90 transition active:scale-[0.98] dark:text-zinc-400 dark:ring-zinc-600/80 sm:order-1"
        >
          Volver
        </Link>
        <Link
          href="/registro/nuevo/datos"
          aria-disabled={!acepta}
          className={`order-1 inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-full px-6 text-sm font-semibold shadow-sm transition active:scale-[0.98] sm:order-2 ${
            acepta
              ? "bg-rose-600 text-white ring-2 ring-rose-600/30 hover:bg-rose-700"
              : "pointer-events-none cursor-not-allowed bg-zinc-200 text-zinc-500 ring-0 dark:bg-zinc-700 dark:text-zinc-500"
          }`}
          tabIndex={acepta ? 0 : -1}
        >
          Continuar al formulario
        </Link>
      </div>
    </div>
  );
}
