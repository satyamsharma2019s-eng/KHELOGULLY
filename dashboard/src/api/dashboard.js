import { client } from './client';

// All of these are role-scoped server-side (scout/teacher see only their
// schoolOrRegion, admin sees everything) — the frontend does not re-filter.

export async function getStats() {
  const { data } = await client.get('/dashboard/stats');
  return data.data; // { totalAthletes, totalTests, breakdown: [...] }
}

export async function getLeaderboard({ testType, limit = 20 } = {}) {
  const { data } = await client.get('/dashboard/leaderboard', {
    params: { testType, limit },
  });
  return data.data; // array, zScore already filtered non-null server-side
}

export async function getDashboardAthletes({ page = 1, limit = 20, district, gender } = {}) {
  const { data } = await client.get('/dashboard/athletes', {
    params: { page, limit, district, gender },
  });
  return { athletes: data.data, pagination: data.pagination };
}

export async function getHeatmap({ testType } = {}) {
  const { data } = await client.get('/dashboard/heatmap', { params: { testType } });
  return data.data; // array grouped by district
}
