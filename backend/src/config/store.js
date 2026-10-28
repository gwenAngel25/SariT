// Store coordinates — Guindulman Public Market, Bohol (reference/test location)
module.exports = {
  storeName: "Aling Nena's Sari-Sari Store",
  latitude: 9.76183,     // Guindulman Public Market, Guindulman, Bohol
  longitude: 124.48857,  // Guindulman Public Market, Guindulman, Bohol
  geofenceRadiusMeters: Number(process.env.GEOFENCE_RADIUS_METERS) || 50,
};