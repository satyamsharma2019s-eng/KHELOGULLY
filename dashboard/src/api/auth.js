import { client } from './client';

// POST /api/v1/auth/login — response: { success, data: { user, accessToken, refreshToken } }
export async function login(phone, password) {
  const { data } = await client.post('/auth/login', { phone, password });
  return data.data;
}

export async function logout(refreshToken) {
  await client.post('/auth/logout', { refreshToken });
}

// GET /api/v1/auth/profile
export async function fetchProfile() {
  const { data } = await client.get('/auth/profile');
  return data.data;
}
