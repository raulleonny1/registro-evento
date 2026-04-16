export type IereParroquia = {
  area: string;
  parroquia: string;
  iglesia: string;
};

/** Parroquias IERE organizadas por ÁREA */
export const iereParroquias: IereParroquia[] = [
  // 🔵 ÁREA I
  {
    area: "Área I",
    parroquia: "Alicante",
    iglesia: "Iglesia de San Pablo",
  },
  {
    area: "Área I",
    parroquia: "Barcelona",
    iglesia: "Iglesia del Buen Pastor",
  },
  {
    area: "Área I",
    parroquia: "Reus",
    iglesia: "Iglesia de la Natividad",
  },
  {
    area: "Área I",
    parroquia: "Sabadell",
    iglesia: "Iglesia de Cristo",
  },
  {
    area: "Área I",
    parroquia: "Valencia",
    iglesia: "Iglesia de Jesucristo",
  },
  {
    area: "Área I",
    parroquia: "Zaragoza",
    iglesia: "Iglesia de San Andrés",
  },

  // 🟡 ÁREA II
  {
    area: "Área II",
    parroquia: "Sevilla",
    iglesia: "Iglesia de la Ascensión",
  },
  {
    area: "Área II",
    parroquia: "Sevilla",
    iglesia: "Iglesia de San Basilio",
  },
  {
    area: "Área II",
    parroquia: "Torre del Mar (Málaga)",
    iglesia: "Iglesia de San Bernabé",
  },
  {
    area: "Área II",
    parroquia: "Calasparra (Murcia)",
    iglesia: "Iglesia Anglicana de Calasparra",
  },
  {
    area: "Área II",
    parroquia: "Las Palmas de Gran Canaria",
    iglesia: "Iglesia de la Trinidad",
  },
  {
    area: "Área II",
    parroquia: "Cómpeta (Málaga)",
    iglesia: "Misión en Cómpeta",
  },
  {
    area: "Área II",
    parroquia: "Almería",
    iglesia: "Iglesia de San Rafael",
  },

  // 🔴 ÁREA III
  {
    area: "Área III",
    parroquia: "Madrid",
    iglesia: "Catedral del Redentor",
  },
  {
    area: "Área III",
    parroquia: "Móstoles (Madrid)",
    iglesia: "Iglesia del Buen Pastor",
  },
  {
    area: "Área III",
    parroquia: "Salamanca",
    iglesia: "Iglesia del Redentor",
  },
  {
    area: "Área III",
    parroquia: "Valladolid",
    iglesia: "Iglesia Antigua de los Mártires",
  },
  {
    area: "Área III",
    parroquia: "Alcorcón (Madrid)",
    iglesia: "Iglesia de la Esperanza",
  },
  {
    area: "Área III",
    parroquia: "Oviedo",
    iglesia: "Iglesia de San Juan",
  },
  {
    area: "Área III",
    parroquia: "Navalcarnero (Madrid)",
    iglesia: "Iglesia de San Miguel",
  },
  {
    area: "Área III",
    parroquia: "La Coruña",
    iglesia: "Iglesia de Santa Cruz",
  },
  {
    area: "Área III",
    parroquia: "Pontevedra",
    iglesia: "Iglesia Episcopal de Cristo",
  },
  {
    area: "Área III",
    parroquia: "Pamplona",
    iglesia: "Iglesia de San Mateo",
  },
  {
    area: "Área III",
    parroquia: "Torrejón de Ardoz (Madrid)",
    iglesia: "Iglesia de San Pablo",
  },
];

/** Etiqueta corta para selects y listados: parroquia — iglesia */
export function labelParroquia(p: IereParroquia): string {
  return `${p.parroquia} — ${p.iglesia}`;
}

/** Áreas en el orden en que aparecen en el listado. */
export function areasIereEnOrden(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of iereParroquias) {
    if (!seen.has(p.area)) {
      seen.add(p.area);
      out.push(p.area);
    }
  }
  return out;
}

/** Etiqueta para documentos en Firestore (nuevo modelo o legacy `ciudad`/`nombre`). */
export function labelParroquiaFirestore(
  par:
    | {
        area?: string;
        parroquia?: string;
        iglesia?: string;
        ciudad?: string;
        nombre?: string;
        manual?: boolean;
      }
    | undefined,
): string {
  if (!par) return "—";
  const ig = par.iglesia != null ? String(par.iglesia).trim() : "";
  const pr = par.parroquia != null ? String(par.parroquia).trim() : "";
  if (pr && ig) {
    let line = `${pr} — ${ig}`;
    if (par.manual === true) {
      const ar = par.area != null ? String(par.area).trim() : "";
      line = ar ? `${ar} · ${line}` : line;
      line += " (manual)";
    }
    return line;
  }
  const ciudad = par.ciudad != null ? String(par.ciudad).trim() : "";
  const nombre = par.nombre != null ? String(par.nombre).trim() : "";
  if (ciudad && nombre) return `${ciudad} — ${nombre}`;
  return "—";
}
