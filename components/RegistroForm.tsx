"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatFirebaseError } from "@/lib/firebaseError";
import {
  areasIereEnOrden,
  iereParroquias,
  type IereParroquia,
} from "@/lib/iereParroquias";
import { REGISTRO_ESTADOS } from "@/lib/registroEstados";
import { soloDigitos, ultimosDigitos } from "@/lib/phoneDigits";
import {
  MODALIDADES_REGISTRO,
  MINIMO_INSCRIPCION_EUR,
  costoEventoEuros,
  etiquetaModalidadRegistro,
  type ModalidadRegistro,
} from "@/lib/eventoPrecio";

const SUBMIT_TIMEOUT_MS = 35_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(
        new Error(
          `${label} superó ${ms / 1000}s. Comprueba conexión, reglas de Firestore (colección registros) y que el proyecto tenga Firestore activado.`,
        ),
      );
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/* text-base (16px) evita zoom automático en focus en iOS Safari */
const fieldClass =
  "min-h-[52px] w-full touch-manipulation rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-base leading-normal text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 " +
  "focus:border-rose-400 focus:ring-4 focus:ring-rose-500/15 " +
  "dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 " +
  "dark:focus:border-rose-500 dark:focus:ring-rose-500/20";

const selectClass = `${fieldClass} cursor-pointer`;

const labelClass = "text-sm font-semibold text-zinc-800 dark:text-zinc-200";

/** Valor del selector cuando el usuario indica datos a mano. */
const OTRA_PARROQUIA = "__otra__";

function ParroquiaLine({ p }: { p: IereParroquia }) {
  return (
    <span className="block leading-snug">
      <span className="font-normal">{p.parroquia}</span>
      <span className="text-zinc-400 dark:text-zinc-500"> — </span>
      <span className="font-bold text-zinc-900 dark:text-zinc-100">{p.iglesia}</span>
    </span>
  );
}

function IglesiaParroquiaPicker({
  id,
  areas,
  value,
  onChange,
}: {
  id: string;
  areas: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedIdx =
    value === "" || value === OTRA_PARROQUIA ? null : parseInt(value, 10);
  const selectedValid =
    selectedIdx != null &&
    !Number.isNaN(selectedIdx) &&
    selectedIdx >= 0 &&
    selectedIdx < iereParroquias.length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={`${selectClass} flex w-full items-center justify-between gap-2 text-left`}
      >
        <span className="min-w-0 flex-1">
          {value === "" && (
            <span className="text-zinc-400 dark:text-zinc-500">Pulsa para elegir tu parroquia</span>
          )}
          {value === OTRA_PARROQUIA &&
            "Otra — mi área, parroquia o iglesia no aparecen en la lista"}
          {selectedValid && selectedIdx != null && (
            <ParroquiaLine p={iereParroquias[selectedIdx]} />
          )}
        </span>
        <span aria-hidden className="shrink-0 text-zinc-400">
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-950"
        >
          {areas.map((area) => (
            <div key={area}>
              <div className="sticky top-0 z-10 bg-zinc-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {area}
              </div>
              {iereParroquias
                .map((p, globalIdx) => ({ p, globalIdx }))
                .filter(({ p }) => p.area === area)
                .map(({ p, globalIdx }) => {
                  const isSel = value === String(globalIdx);
                  return (
                    <button
                      key={`${p.parroquia}-${p.iglesia}-${globalIdx}`}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      className={`w-full px-3 py-2.5 text-left text-base transition hover:bg-rose-50 dark:hover:bg-rose-950/30 ${
                        isSel ? "bg-rose-50/80 dark:bg-rose-950/40" : ""
                      }`}
                      onClick={() => {
                        onChange(String(globalIdx));
                        setOpen(false);
                      }}
                    >
                      <ParroquiaLine p={p} />
                    </button>
                  );
                })}
            </div>
          ))}
          <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
          <button
            type="button"
            role="option"
            aria-selected={value === OTRA_PARROQUIA}
            className={`w-full px-3 py-2.5 text-left text-base transition hover:bg-rose-50 dark:hover:bg-rose-950/30 ${
              value === OTRA_PARROQUIA ? "bg-rose-50/80 dark:bg-rose-950/40" : ""
            }`}
            onClick={() => {
              onChange(OTRA_PARROQUIA);
              setOpen(false);
            }}
          >
            Otra — mi área, parroquia o iglesia no aparecen en la lista
          </button>
        </div>
      )}
    </div>
  );
}

export function RegistroForm() {
  const router = useRouter();
  const [nombreApellidos, setNombreApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [parroquiaIdx, setParroquiaIdx] = useState("");
  const [areaManual, setAreaManual] = useState("");
  const [parroquiaManual, setParroquiaManual] = useState("");
  const [iglesiaManual, setIglesiaManual] = useState("");
  const [modalidadRegistro, setModalidadRegistro] = useState<ModalidadRegistro>(
    MODALIDADES_REGISTRO.completo_25_27,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const areas = useMemo(() => areasIereEnOrden(), []);

  const esOtra = parroquiaIdx === OTRA_PARROQUIA;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let parroquiaPayload: {
      area: string;
      parroquia: string;
      iglesia: string;
      manual?: boolean;
    };

    if (parroquiaIdx === OTRA_PARROQUIA) {
      const area = areaManual.trim();
      const parr = parroquiaManual.trim();
      const igl = iglesiaManual.trim();
      if (!area || !parr || !igl) {
        setError("Completa área, parroquia/localidad e iglesia, o elige una opción de la lista.");
        return;
      }
      parroquiaPayload = { area, parroquia: parr, iglesia: igl, manual: true };
    } else {
      const idx = parseInt(parroquiaIdx, 10);
      if (Number.isNaN(idx) || idx < 0 || idx >= iereParroquias.length) {
        setError("Selecciona una parroquia válida.");
        return;
      }
      const parroquia = iereParroquias[idx];
      parroquiaPayload = {
        area: parroquia.area,
        parroquia: parroquia.parroquia,
        iglesia: parroquia.iglesia,
      };
    }

    const wa = whatsapp.trim();
    const whatsappDigitos = soloDigitos(wa);
    if (whatsappDigitos.length < 4) {
      setError("El teléfono debe tener al menos 4 dígitos para poder localizar tu registro después.");
      return;
    }

    setLoading(true);
    try {
      const whatsappUltimos4 = ultimosDigitos(wa, 4);

      const ref = await withTimeout(
        addDoc(collection(db, "registros"), {
          nombre: nombreApellidos.trim(),
          email: email.trim().toLowerCase(),
          whatsapp: wa,
          whatsappDigitos,
          whatsappUltimos4,
          parroquia: parroquiaPayload,
          modalidadRegistro,
          estado: REGISTRO_ESTADOS.pendiente_pago,
          fecha: serverTimestamp(),
        }),
        SUBMIT_TIMEOUT_MS,
        "El registro",
      );
      await router.push(`/registro/nuevo/exito?id=${encodeURIComponent(ref.id)}`);
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="space-y-2">
        <label htmlFor="reg-nombre" className={labelClass}>
          Nombre y apellidos
        </label>
        <input
          id="reg-nombre"
          name="nombre"
          required
          autoComplete="name"
          autoCapitalize="words"
          type="text"
          enterKeyHint="next"
          value={nombreApellidos}
          onChange={(e) => setNombreApellidos(e.target.value)}
          placeholder="Ej. María García López"
          className={fieldClass}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="reg-email" className={labelClass}>
          Correo electrónico
        </label>
        <input
          id="reg-email"
          name="email"
          required
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          type="email"
          inputMode="email"
          enterKeyHint="next"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className={fieldClass}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="reg-whatsapp" className={labelClass}>
          WhatsApp
        </label>
        <input
          id="reg-whatsapp"
          name="whatsapp"
          required
          autoComplete="tel"
          type="tel"
          inputMode="tel"
          enterKeyHint="next"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Ej. +34 612 345 678"
          className={fieldClass}
        />
      </div>
      <div className="space-y-2">
        <p className={labelClass}>Opciones de asistencia</p>
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
          {(Object.values(MODALIDADES_REGISTRO) as ModalidadRegistro[]).map((opt) => {
            const selected = modalidadRegistro === opt;
            return (
              <label
                key={opt}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition ${
                  selected
                    ? "border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-950/30"
                    : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                }`}
              >
                <input
                  type="radio"
                  name="modalidadRegistro"
                  value={opt}
                  checked={selected}
                  onChange={() => setModalidadRegistro(opt)}
                  className="mt-1 size-4 accent-rose-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {etiquetaModalidadRegistro(opt)}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-400">
                    Precio: {costoEventoEuros(opt)} EUR
                  </span>
                </span>
              </label>
            );
          })}
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Para la inscripción se debe hacer una reserva de {MINIMO_INSCRIPCION_EUR} EUR. O su pago en totalidad.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="reg-parroquia" className={labelClass}>
          Iglesia IERE (área, ciudad, iglesia)
        </label>
        <IglesiaParroquiaPicker
          id="reg-parroquia"
          areas={areas}
          value={parroquiaIdx}
          onChange={setParroquiaIdx}
        />
        {esOtra && (
          <div className="mt-4 space-y-4 rounded-xl border border-rose-200/80 bg-rose-50/50 p-4 dark:border-rose-500/25 dark:bg-rose-950/20">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Indica tus datos (el organizador podrá contrastarlos)
            </p>
            <div className="space-y-2">
              <label htmlFor="reg-area-manual" className={labelClass}>
                Área
              </label>
              <input
                id="reg-area-manual"
                name="areaManual"
                type="text"
                autoComplete="off"
                value={areaManual}
                onChange={(e) => setAreaManual(e.target.value)}
                placeholder="Ej. Área I, o el nombre que corresponda"
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="reg-parroquia-manual" className={labelClass}>
                Parroquia / localidad
              </label>
              <input
                id="reg-parroquia-manual"
                name="parroquiaManual"
                type="text"
                autoComplete="off"
                value={parroquiaManual}
                onChange={(e) => setParroquiaManual(e.target.value)}
                placeholder="Ej. Ciudad o comunidad"
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="reg-iglesia-manual" className={labelClass}>
                Iglesia
              </label>
              <input
                id="reg-iglesia-manual"
                name="iglesiaManual"
                type="text"
                autoComplete="off"
                value={iglesiaManual}
                onChange={(e) => setIglesiaManual(e.target.value)}
                placeholder="Nombre de la iglesia"
                className={fieldClass}
              />
            </div>
          </div>
        )}
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {esOtra
            ? "Los datos manuales se revisan con el equipo IERE."
            : "Si no ves tu comunidad, elige «Otra» al final del listado y escribe área, parroquia e iglesia."}
        </p>
      </div>
      {error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-snug text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="touch-manipulation mt-1 flex min-h-[56px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-rose-700 to-rose-800 px-4 py-4 text-base font-semibold text-white shadow-lg shadow-rose-900/25 transition active:scale-[0.99] disabled:opacity-60 dark:from-rose-600 dark:to-rose-700 dark:shadow-black/30"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span
              className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
            Enviando…
          </span>
        ) : (
          "Continuar al siguiente paso"
        )}
      </button>
    </form>
  );
}
