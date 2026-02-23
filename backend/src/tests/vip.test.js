/**
 * VIP System Unit Tests
 * Run with: npm test (if Jest configured) or node backend/src/tests/vip.test.js
 */

const { 
  checkAndActivateVIP, 
  processVIPRewards, 
  getUserVIPStatus, 
  setVIPStatus,
  getWeekStart 
} = require('../services/vip');

// Mock database client
jest.mock('../db/client', () => ({
  query: jest.fn(),
}));

const { query } = require('../db/client');

describe('VIP System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeekStart', () => {
    it('should return Monday of the week', () => {
      const monday = new Date('2024-01-15'); // Monday
      const result = getWeekStart(monday);
      expect(result.getDay()).toBe(1); // Monday = 1
    });
  });

  describe('checkAndActivateVIP', () => {
    it('should activate users with 10+ trips this week', async () => {
      query.mockResolvedValueOnce({
        rows: [{ trips_per_week_for_vip: 10 }],
      });
      query.mockResolvedValueOnce({
        rows: [
          { id: 'user1', trip_count: 12 },
          { id: 'user2', trip_count: 10 },
        ],
      });
      query.mockResolvedValue({ rows: [] });

      const result = await checkAndActivateVIP();
      
      expect(result.length).toBe(2);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('HAVING COUNT(t.id) >='),
        expect.any(Array)
      );
    });

    it('should not activate users with less than 10 trips', async () => {
      query.mockResolvedValueOnce({
        rows: [{ trips_per_week_for_vip: 10 }],
      });
      query.mockResolvedValueOnce({
        rows: [{ id: 'user1', trip_count: 9 }],
      });

      const result = await checkAndActivateVIP();
      expect(result.length).toBe(0);
    });
  });

  describe('processVIPRewards', () => {
    it('should give reward when vip_level is multiple of 5', async () => {
      query.mockResolvedValueOnce({
        rows: [{ vip_status: true, vip_level: 5 }],
      });
      query.mockResolvedValueOnce({
        rows: [{ trips_per_reward: 5, reward_discount_percentage: 20 }],
      });
      query.mockResolvedValueOnce({
        rows: [{ fare_amount: 100 }],
      });
      query.mockResolvedValue({ rows: [] });

      const result = await processVIPRewards('trip1', 'user1');
      
      expect(result).not.toBeNull();
      expect(result.rewardType).toBe('discount');
      expect(result.rewardValue).toBe(20); // 20% of 100
      expect(result.vipLevel).toBe(5);
    });

    it('should not give reward when vip_level is not multiple of 5', async () => {
      query.mockResolvedValueOnce({
        rows: [{ vip_status: true, vip_level: 4 }],
      });

      const result = await processVIPRewards('trip1', 'user1');
      expect(result).toBeNull();
    });

    it('should not give reward to non-VIP users', async () => {
      query.mockResolvedValueOnce({
        rows: [{ vip_status: false, vip_level: 5 }],
      });

      const result = await processVIPRewards('trip1', 'user1');
      expect(result).toBeNull();
    });
  });

  describe('getUserVIPStatus', () => {
    it('should return VIP status for VIP user', async () => {
      query.mockResolvedValueOnce({
        rows: [{ vip_status: true, vip_since: '2024-01-01', vip_level: 5, vip_auto_activated: true }],
      });
      query.mockResolvedValueOnce({
        rows: [{ trips_per_reward: 5 }],
      });
      query.mockResolvedValueOnce({
        rows: [{ count: 2 }],
      });

      const result = await getUserVIPStatus('user1');
      
      expect(result.vip_status).toBe(true);
      expect(result.vip_level).toBe(5);
      expect(result.trips_until_next_reward).toBeDefined();
    });

    it('should return progress for non-VIP user', async () => {
      query.mockResolvedValueOnce({
        rows: [{ vip_status: false }],
      });
      query.mockResolvedValueOnce({
        rows: [{ trip_count: 7 }],
      });
      query.mockResolvedValueOnce({
        rows: [{ trips_per_week_for_vip: 10 }],
      });

      const result = await getUserVIPStatus('user1');
      
      expect(result.vip_status).toBe(false);
      expect(result.trips_this_week).toBe(7);
      expect(result.trips_needed_for_vip).toBe(10);
      expect(result.progress_percent).toBe(70);
    });
  });

  describe('setVIPStatus', () => {
    it('should activate VIP', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await setVIPStatus('user1', true, 'admin1');
      
      expect(result.success).toBe(true);
      expect(result.vip_status).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('vip_status = TRUE'),
        expect.any(Array)
      );
    });

    it('should deactivate VIP', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await setVIPStatus('user1', false);
      
      expect(result.success).toBe(true);
      expect(result.vip_status).toBe(false);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('vip_status = FALSE'),
        expect.any(Array)
      );
    });
  });
});

// Note: These are example tests. To run, install Jest:
// npm install --save-dev jest
// Add to package.json: "test": "jest"
// Run: npm test
