import Image from "next/image";
import Link from "next/link";
import { RegistroOpciones } from "@/components/RegistroOpciones";
import { Inter, Playfair_Display } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

function LockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

const glassRegistro =
  "border border-gray-200/50 bg-white/80 backdrop-blur-md shadow-xl transition-[transform,box-shadow] duration-200 ease-out active:scale-[0.98]";

const glassAdmin =
  "border-2 border-dashed border-slate-200 bg-slate-50/80 backdrop-blur-md shadow-md transition-[transform,box-shadow] duration-200 ease-out active:scale-[0.98]";

export function HomeHub() {
  return (
    <main
      className={`${inter.className} text-slate-800 antialiased`}
      style={{
        background: "linear-gradient(180deg, #fff5f5 0%, #ffffff 100%)",
      }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        {/* Logo */}
        <div className="mb-8 rounded-3xl border border-red-50 bg-white p-4 shadow-sm [filter:drop-shadow(0_4px_6px_rgba(0,0,0,0.05))]">
          <Image
            src="/logo-iere.jpg"
            alt="IERE — Iglesia Española Reformada Episcopal"
            width={240}
            height={180}
            className="h-24 w-auto max-w-[200px] object-contain"
            priority
            sizes="200px"
          />
        </div>

        {/* Badge */}
        <div className="mb-4">
          <span className="inline-block rounded-full bg-red-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-red-700">
            IERE · 2026
          </span>
        </div>

        {/* Título */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold leading-tight tracking-tight text-slate-900">
            Encuentro Nacional <br />
            de Mujeres IERE
          </h1>
          <p className="mb-4 text-lg font-semibold text-red-700">
            25 al 27 de septiembre de 2026
          </p>
          <p className={`${playfair.className} text-xl italic text-slate-500`}>
            &ldquo;Cada Don, una Misión&rdquo;
          </p>
        </div>

        <p className="mb-10 max-w-sm px-2 text-center text-sm leading-relaxed text-slate-500">
          Desde Registro puedes inscribirte, continuar un trámite o ver tu código; la administración
          es solo para el equipo del evento.
        </p>

        {/* Tarjetas */}
        <div className="w-full space-y-4">
          <div className={`${glassRegistro} group flex w-full flex-col rounded-3xl p-6 text-left`}>
            <div className="mb-4 min-w-0">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-red-600">
                Participantes
              </span>
              <h2 className="mb-1 text-xl font-bold text-slate-900">Registro</h2>
              <p className="text-xs leading-relaxed text-slate-500">
                Inscripción, comprobante y seguimiento de tu solicitud.
              </p>
            </div>
            <RegistroOpciones />
          </div>

          <Link
            href="/admin"
            className={`${glassAdmin} group flex w-full touch-manipulation items-center justify-between rounded-3xl p-6 text-left`}
          >
            <div className="min-w-0 flex-1">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Organización
              </span>
              <h2 className="mb-1 text-xl font-bold text-slate-700">Administración</h2>
              <p className="text-xs leading-relaxed text-slate-500">
                Revisar inscripciones y check-in (código requerido).
              </p>
            </div>
            <div className="ml-4 shrink-0 rounded-2xl bg-slate-200 p-3 text-slate-600 transition-colors group-hover:bg-slate-300">
              <LockIcon />
            </div>
          </Link>
        </div>

        <footer className="mt-auto pt-12 text-center text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Iglesia Española Reformada Episcopal
        </footer>
      </div>
    </main>
  );
}
