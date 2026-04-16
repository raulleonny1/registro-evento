export type IereParroquia = {
  zona: string;
  ciudad: string;
  nombre: string;
};

/** Parroquias IERE España para el selector de registro. */
export const iereParroquias: IereParroquia[] = [
  { zona: "Centro", ciudad: "Madrid", nombre: "Catedral del Redentor" },
  { zona: "Centro", ciudad: "Madrid", nombre: "San Pablo" },
  { zona: "Centro", ciudad: "Móstoles", nombre: "Comunidad Anglicana de Móstoles" },
  { zona: "Centro", ciudad: "Alcorcón", nombre: "Comunidad Anglicana de Alcorcón" },
  { zona: "Centro", ciudad: "Salamanca", nombre: "Iglesia de Salamanca (Atilano Coco)" },
  { zona: "Norte", ciudad: "Valladolid", nombre: "Comunidad de Valladolid" },
  { zona: "Norte", ciudad: "Oviedo", nombre: "Comunidad de Oviedo" },
  { zona: "Norte", ciudad: "Bilbao", nombre: "Comunidad de Bilbao" },
  { zona: "Norte", ciudad: "Vitoria", nombre: "Misión de Vitoria" },
  { zona: "Cataluña", ciudad: "Barcelona", nombre: "Comunidad de Barcelona" },
  { zona: "Cataluña", ciudad: "Tarragona", nombre: "Comunidad de Tarragona" },
  { zona: "Levante", ciudad: "Valencia", nombre: "Comunidad de Valencia" },
  { zona: "Levante", ciudad: "Alicante", nombre: "Comunidad de Alicante" },
  { zona: "Levante", ciudad: "Castellón", nombre: "Comunidad de Castellón" },
  { zona: "Andalucía", ciudad: "Sevilla", nombre: "Comunidad de Sevilla" },
  { zona: "Andalucía", ciudad: "Málaga", nombre: "Comunidad de Málaga" },
  { zona: "Andalucía", ciudad: "Granada", nombre: "Comunidad de Granada" },
  { zona: "Murcia", ciudad: "Murcia", nombre: "Comunidad de Murcia" },
  { zona: "Murcia", ciudad: "Cartagena", nombre: "Comunidad de Cartagena" },
  { zona: "Canarias", ciudad: "Las Palmas", nombre: "Comunidad de Las Palmas" },
  { zona: "Canarias", ciudad: "Tenerife", nombre: "Comunidad de Tenerife" },
];

/** Etiqueta corta para selects y listados. */
export function labelParroquia(p: IereParroquia): string {
  return `${p.ciudad} — ${p.nombre}`;
}

/** Zonas en el orden en que aparecen en el listado. */
export function zonasIereEnOrden(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of iereParroquias) {
    if (!seen.has(p.zona)) {
      seen.add(p.zona);
      out.push(p.zona);
    }
  }
  return out;
}
