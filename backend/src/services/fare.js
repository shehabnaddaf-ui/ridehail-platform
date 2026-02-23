/**
 * Fare estimation and calculation (base + per km + per minute, surge)
 */

const { query } = require('../db/client');

async function getFareConfig(rideType = 'economy') {
  const res = await query(
    'SELECT base_fare, per_km, per_minute, min_fare, surge_multiplier FROM fare_config WHERE ride_type = $1 AND active = TRUE',
    [rideType]
  );
  if (res.rows.length === 0) throw new Error('Fare config not found');
  return res.rows[0];
}

async function getSystemSettings() {
  const res = await query('SELECT key, value FROM system_settings');
  const settings = {};
  res.rows.forEach(s => settings[s.key] = s.value);
  return settings;
}

function estimateFare(config, distanceKm, durationMin, surgeMultiplier = 1, fuelPrice = 24000, profitMult = 3, consumptionLPerKm = 0.1) {
  const mult = Number(surgeMultiplier) || 1;
  const base = Number(config.base_fare);
  const perMin = Number(config.per_minute);
  const minFare = Number(config.min_fare);

  // New Algorithm: Fuel based
  // Cost = distance * consumption * price
  const fuelCost = distanceKm * consumptionLPerKm * fuelPrice;
  const profitMargin = fuelCost * (profitMult - 1); // Multiplier x3 means profit is 2x cost

  let amount = base + fuelCost + profitMargin + (durationMin * perMin);
  amount *= mult;

  return Math.max(minFare, Math.round(amount));
}

async function estimateFareForTrip(rideType, distanceKm, durationMin, surgeMultiplier = 1, driverId = null) {
  const config = await getFareConfig(rideType);
  const settings = await getSystemSettings();

  const fuelPrice = Number(settings.fuel_price_liter) || 24000;
  const profitMult = Number(settings.profit_multiplier) || 3;

  let consumptionLPerKm = 0.1; // Default
  if (driverId) {
    const driverRes = await query('SELECT fuel_consumption_tanaka_km FROM drivers WHERE id = $1', [driverId]);
    if (driverRes.rows.length > 0 && driverRes.rows[0].fuel_consumption_tanaka_km) {
      consumptionLPerKm = 25 / driverRes.rows[0].fuel_consumption_tanaka_km;
    }
  }

  const estimatedFare = estimateFare(config, distanceKm, durationMin, surgeMultiplier, fuelPrice, profitMult, consumptionLPerKm);
  return { estimatedFare, config, settings };
}

async function calculateFinalFare(tripId) {
  const tripRes = await query(
    'SELECT ride_type, driver_id, final_distance_km, final_duration_min, surge_multiplier FROM trips WHERE id = $1',
    [tripId]
  );
  if (tripRes.rows.length === 0) throw new Error('Trip not found');
  const trip = tripRes.rows[0];

  const { estimatedFare } = await estimateFareForTrip(
    trip.ride_type,
    Number(trip.final_distance_km) || 0,
    Number(trip.final_duration_min) || 0,
    Number(trip.surge_multiplier) || 1,
    trip.driver_id
  );

  return estimatedFare;
}

module.exports = { getFareConfig, estimateFare, estimateFareForTrip, calculateFinalFare, getSystemSettings };
