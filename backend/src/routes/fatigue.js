/**
 * Driver fatigue: session length, rest suggestion
 * Product: Fatigue detection & soft rest suggestions; protect driver and rider.
 */

const express = require('express');
const { query } = require('../db/client');
const { authDriver } = require('../middleware/auth');

const router = express.Router();

const SUGGEST_REST_AFTER_HOURS = 4;
const SUGGEST_REST_AFTER_TRIPS = 20;

// GET /api/fatigue — Current session and optional rest suggestion
router.get('/', authDriver, async (req, res, next) => {
  try {
    const sessionRes = await query(
      'SELECT id, started_at, total_trips, rest_suggested_at FROM driver_sessions WHERE driver_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
      [req.driverId]
    );
    let session = sessionRes.rows[0];
    if (!session) {
      const insertRes = await query(
        'INSERT INTO driver_sessions (driver_id, started_at) VALUES ($1, NOW()) RETURNING id, started_at, total_trips, rest_suggested_at',
        [req.driverId]
      );
      session = insertRes.rows[0];
    }
    const startedAt = new Date(session.started_at);
    const hoursOnline = (Date.now() - startedAt.getTime()) / (60 * 60 * 1000);
    const tripsRes = await query(
      'SELECT COUNT(*) AS c FROM trips WHERE driver_id = $1 AND status = $2 AND completed_at >= $3',
      [req.driverId, 'completed', session.started_at]
    );
    const tripsThisSession = parseInt(tripsRes.rows[0]?.c || '0', 10);
    await query(
      'UPDATE driver_sessions SET total_trips = $1 WHERE id = $2',
      [tripsThisSession, session.id]
    );

    let suggest_rest = false;
    let suggest_reason = null;
    if (hoursOnline >= SUGGEST_REST_AFTER_HOURS && !session.rest_suggested_at) {
      suggest_rest = true;
      suggest_reason = `You've been on the road for ${Math.floor(hoursOnline)} hours. Consider a short break.`;
    } else if (tripsThisSession >= SUGGEST_REST_AFTER_TRIPS && !session.rest_suggested_at) {
      suggest_rest = true;
      suggest_reason = `You've completed ${tripsThisSession} trips this session. Consider a short break.`;
    }

    if (suggest_rest) {
      await query(
        'UPDATE driver_sessions SET rest_suggested_at = NOW() WHERE id = $1',
        [session.id]
      );
    }

    res.json({
      success: true,
      session: {
        started_at: session.started_at,
        hours_online: Math.round(hoursOnline * 100) / 100,
        trips_this_session: tripsThisSession,
      },
      suggest_rest,
      suggest_reason,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/fatigue/break — Driver takes a break (end session, optional 15 min)
router.post('/break', authDriver, async (req, res, next) => {
  try {
    await query(
      'UPDATE driver_sessions SET ended_at = NOW() WHERE driver_id = $1 AND ended_at IS NULL',
      [req.driverId]
    );
    res.json({ success: true, message: 'Break started. You can go back online when ready.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
