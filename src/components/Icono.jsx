const TRAZOS = {
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />,
  pausa: (
    <>
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  siguiente: <path d="M6 5l9 7-9 7zM18 5v14" />,
  anterior: <path d="M18 5l-9 7 9 7zM6 5v14" />,
  inicio: <path d="M19 5l-7 7 7 7M12 5l-7 7 7 7" />,
  final: <path d="M5 5l7 7-7 7M12 5l7 7-7 7" />,
  subir: <path d="M12 16V4M7 9l5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />,
  bajar: <path d="M12 4v12M7 11l5 5 5-5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />,
  cubo: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5" />,
  planta: <path d="M4 4h16v16H4zM9 4l3 4 3-4M8 12h8v5H8z" />,
  frente: <path d="M3 8h18v10H3zM7 8V5h10v3M8 13h8" />,
  rayo: <path d="M13 3L5 13h6l-1 8 8-10h-6z" />,
  lupa: <path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM16 16l4 4" />,
  ejecutar: <path d="M5 4h4M5 20h4M5 4v16M13 8l6 4-6 4z" />,
  libro: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7" />,
  flecha: <path d="M6 9l6 6 6-6" />,
  ok: <path d="M5 12.5l4.5 4.5L19 7" />,
  error: <path d="M6 6l12 12M18 6L6 18" />,
  aviso: <path d="M12 4l9 16H3zM12 10v4M12 17v.5" />,
  ciclo: <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" />,
  reacomodar: <path d="M4 4h6v6H4zM14 14h6v6h-6zM10 7h4a3 3 0 0 1 3 3v4M7 10v4a3 3 0 0 0 3 3h4" />,
  izquierda: <path d="M15 6l-6 6 6 6" />,
  lapiz: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  mas: <path d="M12 5v14M5 12h14" />,
  deshacer: <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  derecha: <path d="M9 6l6 6-6 6" />,
}

export default function Icono({ nombre, tamano = 18 }) {
  return (
    <svg
      className="icono"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {TRAZOS[nombre]}
    </svg>
  )
}
