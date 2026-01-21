import { getDistance } from 'geolib';

export class GeoService {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lng1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lng2 - Longitude of point 2
   * @returns {number} Distance in meters
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    try {
      return getDistance(
        { latitude: lat1, longitude: lng1 },
        { latitude: lat2, longitude: lng2 }
      );
    } catch (error) {
      console.error('Distance calculation error:', error);
      throw new Error('Failed to calculate distance');
    }
  }

  /**
   * Check if user is within allowed radius of school
   * @param {number} userLat - User latitude
   * @param {number} userLng - User longitude
   * @param {number} schoolLat - School latitude
   * @param {number} schoolLng - School longitude
   * @param {number} radiusMeters - Allowed radius in meters
   * @returns {boolean} True if within radius
   */
  static isWithinSchoolRadius(userLat, userLng, schoolLat, schoolLng, radiusMeters) {
    try {
      // Basic coordinate validation
      if (!this.isValidCoordinate(userLat, userLng) || !this.isValidCoordinate(schoolLat, schoolLng)) {
        return false;
      }

      const distance = this.calculateDistance(userLat, userLng, schoolLat, schoolLng);
      return distance <= radiusMeters;
    } catch (error) {
      console.error('Geo-fencing validation error:', error);
      return false;
    }
  }

  /**
   * Validate coordinate values
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean} True if coordinates are valid
   */
  static isValidCoordinate(lat, lng) {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  /**
   * Validate location accuracy
   * @param {number} accuracy - Location accuracy in meters
   * @param {number} maxAccuracy - Maximum allowed accuracy
   * @returns {boolean} True if accuracy is acceptable
   */
  static validateLocationAccuracy(accuracy, maxAccuracy = 100) {
    return typeof accuracy === 'number' && accuracy >= 0 && accuracy <= maxAccuracy;
  }

  /**
   * Get approximate address from coordinates (mock - in real app, use Google Geocoding API)
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<string>} Approximate address
   */
  static async getApproximateAddress(lat, lng) {
    // In a real application, you would use a geocoding service like:
    // Google Maps Geocoding API, OpenStreetMap Nominatim, etc.
    
    // Mock implementation
    return `Location near coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  /**
   * Check if two locations are likely the same (within small radius)
   * @param {Object} loc1 - First location {lat, lng}
   * @param {Object} loc2 - Second location {lat, lng}
   * @param {number} threshold - Threshold in meters (default: 50m)
   * @returns {boolean} True if locations are likely the same
   */
  static isSameLocation(loc1, loc2, threshold = 50) {
    const distance = this.calculateDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
    return distance <= threshold;
  }
}