import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, StatusBar, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Notifications from 'expo-notifications';
import { Magnetometer } from 'expo-sensors';
import { ROTA, DESTINO } from './src/data/rota';
import { haversine, bearing, normalizar } from './src/utils/geo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const VELOCIDADE_MEDIA_KMH = 25; // usada só para estimar o tempo restante

function statusDaEntrega(distancia) {
  if (distancia <= 30) return 'Entregue';
  if (distancia <= 500) return 'Próximo';
  return 'Em Trânsito';
}

export default function App() {
  const mapRef = useRef(null);
  const avisou = useRef(false);
  const [idx, setIdx] = useState(0);
  const [heading, setHeading] = useState(0);

  const posicao = ROTA[idx];
  const proxima = ROTA[Math.min(idx + 1, ROTA.length - 1)];
  const distancia = haversine(posicao, DESTINO);
  const status = statusDaEntrega(distancia);
  const minutos = Math.ceil(distancia / ((VELOCIDADE_MEDIA_KMH * 1000) / 60));
  const direcaoDeslocamento = bearing(posicao, proxima);
  // Ícone gira conforme a direção do deslocamento em relação para onde o celular aponta
  const anguloIcone = normalizar(direcaoDeslocamento - heading);

  // Permissão de notificação + canal Android
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      await Notifications.requestPermissionsAsync();
    })();
  }, []);

  // Simulação do entregador (setInterval sobre o array de pontos)
  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i < ROTA.length - 1 ? i + 1 : i));
    }, 1500);
    return () => clearInterval(t);
  }, []);

  // Magnetômetro (bússola)
  useEffect(() => {
    Magnetometer.setUpdateInterval(200);
    const sub = Magnetometer.addListener(({ x, y }) => {
      setHeading(normalizar(Math.atan2(y, x) * (180 / Math.PI) - 90));
    });
    return () => sub.remove();
  }, []);

  // Notificação quando faltar menos de 500 m
  useEffect(() => {
    if (distancia < 500 && !avisou.current) {
      avisou.current = true;
      Notifications.scheduleNotificationAsync({
        content: {
          title: '📦 Sua entrega está chegando!',
          body: `O entregador está a ${Math.round(distancia)} metros.`,
        },
        trigger: null, // dispara agora
      });
    }
  }, [distancia]);

  // Enquadra o mapa na primeira renderização
  const ajustarMapa = () =>
    mapRef.current?.fitToCoordinates([ROTA[0], DESTINO], {
      edgePadding: { top: 80, right: 60, bottom: 280, left: 60 },
      animated: true,
    });

  const reiniciar = () => {
    avisou.current = false;
    setIdx(0);
  };

  const cor = status === 'Entregue' ? '#16a34a' : status === 'Próximo' ? '#f59e0b' : '#2563eb';

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        onMapReady={ajustarMapa}
        initialRegion={{
          latitude: -23.556,
          longitude: -46.645,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        <Polyline coordinates={[posicao, DESTINO]} strokeColor="#2563eb" strokeWidth={4} />
        <Marker coordinate={DESTINO} title="Endereço de entrega" pinColor="red" />
        <Marker coordinate={posicao} title="Entregador" anchor={{ x: 0.5, y: 0.5 }}>
          <Text style={{ fontSize: 30 }}>🚚</Text>
        </Marker>
      </MapView>

      <View style={s.painel}>
        <View style={s.linha}>
          <View style={[s.badge, { backgroundColor: cor }]}>
            <Text style={s.badgeTxt}>{status}</Text>
          </View>
          <View style={[s.bussola, { transform: [{ rotate: `${anguloIcone}deg` }] }]}>
            <Text style={{ fontSize: 28 }}>⬆️</Text>
          </View>
        </View>

        <Text style={s.titulo}>
          {status === 'Entregue' ? 'Pedido entregue!' : `Chega em ~${minutos} min`}
        </Text>
        <Text style={s.sub}>Distância: {Math.round(distancia)} m</Text>
        <Text style={s.sub}>Direção do veículo: {Math.round(direcaoDeslocamento)}° · Bússola: {Math.round(heading)}°</Text>

        <TouchableOpacity style={s.botao} onPress={reiniciar}>
          <Text style={s.botaoTxt}>Reiniciar simulação</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  painel: {
    position: 'absolute', left: 12, right: 12, bottom: 28,
    backgroundColor: '#fff', borderRadius: 18, padding: 16, elevation: 8,
  },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeTxt: { color: '#fff', fontWeight: '700' },
  bussola: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  sub: { color: '#555', marginTop: 2 },
  botao: { marginTop: 12, backgroundColor: '#111', padding: 12, borderRadius: 12, alignItems: 'center' },
  botaoTxt: { color: '#fff', fontWeight: '600' },
});
