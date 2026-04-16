"use client";

import { useCallback, useEffect, useState } from "react";
import { getFirestoreLazy } from "@/lib/firestoreClient";

type Row = {
  id: string;
  nombre: string;
  email: string;
  estado: string;
  comprobanteURL?: string;
};

export default function AdminPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { fs, db } = await getFirestoreLazy();
      const { collection, getDocs } = fs;
      const snap = await getDocs(collection(db, "registros"));
      const list: Row[] = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          nombre: String(x.nombre ?? ""),
          email: String(x.email ?? ""),
          estado: String(x.estado ?? ""),
          comprobanteURL: x.comprobanteURL ? String(x.comprobanteURL) : undefined,
        };
      });
      list.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al listar");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function aprobar(registroId: string) {
    setBusyId(registroId);
    setError(null);
    try {
      const { fs, db } = await getFirestoreLazy();
      const { doc, updateDoc } = fs;
      const { generateQrDataUrl } = await import("@/lib/qr");
      const qr = await generateQrDataUrl(registroId, 320);
      await updateDoc(doc(db, "registros", registroId), {
        estado: "aprobado",
        qr,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al aprobar");
    } finally {
      setBusyId(null);
    }
  }

  async function rechazar(registroId: string) {
    setBusyId(registroId);
    setError(null);
    try {
      const { fs, db } = await getFirestoreLazy();
      const { doc, updateDoc } = fs;
      await updateDoc(doc(db, "registros", registroId), { estado: "rechazado" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al rechazar");
    } finally {
      setBusyId(null);
    }
  }

  if (error && !rows?.length) {
    return <p className="text-red-600">{error}</p>;
  }
  if (rows === null) {
    return <p className="text-zinc-500">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={() => void load()}
        className="w-fit rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-600"
      >
        Actualizar lista
      </button>
      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-700">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
              <th className="p-2">Nombre</th>
              <th className="p-2">Email</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Comprobante</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="p-2 align-top">{r.nombre}</td>
                <td className="p-2 align-top">{r.email}</td>
                <td className="p-2 align-top">{r.estado}</td>
                <td className="p-2 align-top">
                  {r.comprobanteURL ? (
                    <a
                      href={r.comprobanteURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline dark:text-blue-400"
                    >
                      Ver
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2 align-top">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => aprobar(r.id)}
                      className="rounded bg-green-700 px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => rechazar(r.id)}
                      className="rounded bg-red-700 px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="text-zinc-500">No hay registros.</p>}
    </div>
  );
}
