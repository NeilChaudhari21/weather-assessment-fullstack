"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

type WeatherMapProps = {
  latitude: number;
  longitude: number;
  label: string;
};

const locationPinIcon = L.divIcon({
  className: "weather-map-pin",
  html: `
    <svg class="weather-map-pin-svg" viewBox="0 0 64 86" aria-hidden="true">
      <path fill="currentColor" d="M32 0C14.3 0 0 14.3 0 32c0 24.1 32 54 32 54s32-29.9 32-54C64 14.3 49.7 0 32 0Zm0 47a15 15 0 1 1 0-30 15 15 0 0 1 0 30Z" />
    </svg>
  `,
  iconSize: [34, 46],
  iconAnchor: [17, 44],
  popupAnchor: [0, -42],
});

export default function WeatherMap({
  latitude,
  longitude,
  label,
}: WeatherMapProps) {
  const position: [number, number] = [latitude, longitude];

  return (
    <MapContainer
      center={position}
      zoom={10}
      scrollWheelZoom={false}
      className="h-72"
    >
      <MapRecenter latitude={latitude} longitude={longitude} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker icon={locationPinIcon} position={position}>
        <Popup>{label}</Popup>
      </Marker>
    </MapContainer>
  );
}

function MapRecenter({
  latitude,
  longitude,
}: Pick<WeatherMapProps, "latitude" | "longitude">) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom(), {
      animate: true,
    });
  }, [latitude, longitude, map]);

  return null;
}
