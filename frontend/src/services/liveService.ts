// Contrato futuro de la conexión con LiveKit (ESSENTIALS > Clases en vivo). Todavía sin dependencia:
// livekit-client y @livekit/components-react se instalan con el encargo de envivo.
//   conectarASala({ url, token }): el token SIEMPRE lo emite la API tras la cadena completa de
//     middleware; el frontend nunca firma ni guarda llaves de LiveKit.
//   desconectar(): cierra la sala activa.
// Este módulo existe para fijar la ubicación (services/liveService.ts, CLAUDE.md) y el contrato.
export {}
