// Datos ilusorios de los escenarios del Proyecto STAR.
// Todo lo que muestra la app sale de acá: para agregar o cambiar un escenario,
// se edita este archivo (y se regeneran las miniaturas del hub).
(function () {
  // Planta del cliente (ficticia) y punto de partida del técnico, en Pilar, Bs. As.
  var SITE = { name: "Planta Norte", city: "Pilar, Bs. As.", lat: -34.444, lng: -58.879 };
  var TECH_START = { lat: -34.4615, lng: -58.7875 }; // sobre Panamericana, a ~8 km de la planta

  var TECH = { name: "Martín Gómez", short: "Martín", initials: "MG", role: "Servicio técnico" };

  var EQUIPOS = {
    compresor: {
      icon: "air",
      type: "Aire · Compresor",
      name: "Compresor a tornillo Sullair",
      model: "S-energy 7505",
      serial: "202312-0456",
      internal: "C-118",
      service: "Mantenimiento preventivo",
      detail: "Mantenimiento programado por horas de uso: cambio de aceite Sullube 32, filtros de aire y aceite, y control general del equipo.",
    },
    grupo: {
      icon: "power",
      type: "Energía · Grupo electrógeno",
      name: "Grupo electrógeno Cummins",
      model: "C275 D5",
      serial: "202401-0231",
      internal: "G-042",
      service: "Cambio de filtros",
    },
    plataforma: {
      icon: "lift",
      type: "Altura · Plataforma",
      name: "Plataforma de tijera JLG",
      model: "2646ES",
      serial: "202211-0987",
      internal: "A-076",
      service: "Revisión correctiva",
    },
  };

  function equipo(key, status) {
    return Object.assign({ status: status }, EQUIPOS[key]);
  }

  var CTA = {
    title: "Gestioná todos tus equipos en SullairGo",
    text: "Seguí visitas, equipos y repuestos desde un solo lugar. Creá tu usuario en un minuto.",
    action: "Generar mi usuario",
  };

  var GROUPS = [
    { id: "reprogramacion", title: "Programación y reprogramación" },
    { id: "visita", title: "El día de la visita" },
  ];

  var SCENARIOS = [
    {
      id: "R1",
      group: "reprogramacion",
      title: "Nunca reprogramó",
      kind: "agenda",
      state: { used: 0, date: "2026-10-15", slots: ["manana"], status: "programada" },
    },
    {
      id: "R2",
      group: "reprogramacion",
      title: "Reprogramó una vez",
      kind: "agenda",
      state: { used: 1, date: "2026-10-19", slots: ["manana"], status: "reprogramada" },
    },
    {
      id: "R3",
      group: "reprogramacion",
      title: "Reprogramó dos veces",
      kind: "agenda",
      state: { used: 2, date: "2026-10-21", slots: ["tarde"], status: "reprogramada" },
    },
    {
      id: "R4",
      group: "reprogramacion",
      title: "Cancela después de dos reprogramaciones",
      kind: "agenda",
      state: { used: 2, date: "2026-10-22", slots: ["tarde"], status: "dia-siguiente" },
    },
    {
      id: "R5",
      group: "reprogramacion",
      title: "Cancela Sullair",
      kind: "agenda",
      state: { used: 0, date: "2026-10-15", slots: ["manana"], status: "cancelada-sullair" },
    },
    {
      id: "1a",
      group: "visita",
      title: "Técnico en camino",
      kind: "seguimiento",
      status: "en-camino",
      eta: "Entre 10:00 y 11:00 h",
      updated: "Actualizado hace 4 min",
      tech: TECH_START,
      equipos: [equipo("compresor", "pendiente")],
      cta: CTA,
    },
    {
      id: "1b",
      group: "visita",
      title: "En sitio · 3 equipos",
      kind: "seguimiento",
      status: "en-sitio",
      since: "En sitio desde las 9:20 h",
      updated: "Actualizado hace 4 min",
      equipos: [equipo("compresor", "en-curso"), equipo("grupo", "pendiente"), equipo("plataforma", "terminado")],
      cta: CTA,
    },
    {
      id: "1c",
      group: "visita",
      title: "Visita finalizada",
      kind: "seguimiento",
      status: "finalizada",
      finished: "Hoy · finalizó a las 12:45 h",
      equipos: [equipo("compresor", "terminado"), equipo("grupo", "terminado"), equipo("plataforma", "terminado")],
      cta: {
        title: CTA.title,
        text: "Guardá el historial de esta visita y seguí tus equipos, servicios y repuestos desde un solo lugar.",
        action: CTA.action,
      },
    },
  ];

  window.STAR = { SITE: SITE, TECH: TECH, EQUIPOS: EQUIPOS, GROUPS: GROUPS, SCENARIOS: SCENARIOS, VISIT_ID: "8f3a2c9b" };
})();
