// Dados simulados (mock): o entregador sai da Praça da Sé e vai até o MASP (Av. Paulista).
// Em vez de backend/WebSocket, a rota é um array de pontos percorrido com setInterval.
const INICIO = { latitude: -23.5505, longitude: -46.6333 };
export const DESTINO = { latitude: -23.5614, longitude: -46.6559 };

const PASSOS = 40;
export const ROTA = Array.from({ length: PASSOS + 1 }, (_, i) => ({
  latitude: INICIO.latitude + ((DESTINO.latitude - INICIO.latitude) * i) / PASSOS,
  longitude: INICIO.longitude + ((DESTINO.longitude - INICIO.longitude) * i) / PASSOS,
}));
