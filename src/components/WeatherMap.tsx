"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

type WeatherMapProps = {
  latitude: number;
  longitude: number;
  label: string;
};

export default function WeatherMap({
  latitude,
  longitude,
  label,
}: WeatherMapProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={10}
      scrollWheelZoom={false}
      className="h-72"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]}>
        <Popup>{label}</Popup>
      </Marker>
    </MapContainer>
  );
}
