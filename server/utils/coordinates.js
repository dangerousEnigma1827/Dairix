/**
 * Coordinate validation and normalization utilities.
 */

/**
 * Validates whether the given latitude and longitude are valid geographic coordinates.
 * - Latitude must be a finite number between -90 and 90 (inclusive).
 * - Longitude must be a finite number between -180 and 180 (inclusive).
 *
 * @param {any} lat - Latitude
 * @param {any} lng - Longitude
 * @returns {boolean} True if coordinates are valid numbers within range
 */
export const isValidCoordinates = (lat, lng) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }

  // Reject boolean, empty strings, etc.
  if (typeof lat === "boolean" || typeof lng === "boolean") {
    return false;
  }

  // Parse if string
  const parsedLat = typeof lat === "string" && lat.trim() !== "" ? Number(lat) : lat;
  const parsedLng = typeof lng === "string" && lng.trim() !== "" ? Number(lng) : lng;

  if (typeof parsedLat !== "number" || typeof parsedLng !== "number") {
    return false;
  }

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    return false;
  }

  return (
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLng >= -180 &&
    parsedLng <= 180
  );
};

/**
 * Normalizes coordinates from an object or lat/lng pair.
 * Returns { latitude, longitude } with numbers, or null if invalid.
 *
 * @param {Object} input - Object containing latitude/longitude or lat/lng
 * @returns {{ latitude: number, longitude: number } | null}
 */
export const normalizeCoordinates = (input) => {
  if (!input || typeof input !== "object") return null;

  const lat = input.latitude !== undefined ? input.latitude : input.lat;
  const lng = input.longitude !== undefined ? input.longitude : input.lng;

  if (!isValidCoordinates(lat, lng)) {
    return null;
  }

  return {
    latitude: typeof lat === "string" ? Number(lat) : Number(lat),
    longitude: typeof lng === "string" ? Number(lng) : Number(lng),
  };
};
