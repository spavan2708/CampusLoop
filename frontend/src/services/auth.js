import api from './api.js'

export async function loginUser(email, password, role = 'student') {
  const body = new URLSearchParams()
  body.set('username', email.trim().toLowerCase())
  body.set('password', password)
  const response = await api.post(`/auth/${role === 'club_admin' ? 'club' : role === 'central_admin' ? 'admin' : 'student'}/login`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return response.data.access_token
}

export async function signupUser(payload) {
  const response = await api.post('/auth/signup', {
    ...payload,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
  })
  return response.data
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me')
  return response.data
}

export async function changePassword(currentPassword, newPassword) {
  await api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword })
}
