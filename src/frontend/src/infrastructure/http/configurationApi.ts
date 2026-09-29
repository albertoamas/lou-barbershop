import type {
  ConfigurationPort,
  ConfigurationSnapshot,
} from '../../core/configuration/Configuration'
import { apiRequest, secureApiRequest } from './apiClient'

export const configurationApi: ConfigurationPort = {
  load: async () => {
    const [users, staff, barbers, services, products, expenseCategories] = await Promise.all([
      apiRequest<ConfigurationSnapshot['users']>('/api/v1/users'),
      apiRequest<ConfigurationSnapshot['staff']>('/api/v1/staff'),
      apiRequest<ConfigurationSnapshot['barbers']>('/api/v1/barbers'),
      apiRequest<ConfigurationSnapshot['services']>('/api/v1/services'),
      apiRequest<ConfigurationSnapshot['products']>('/api/v1/products'),
      apiRequest<ConfigurationSnapshot['expenseCategories']>('/api/v1/expense-categories'),
    ])
    return { users, staff, barbers, services, products, expenseCategories }
  },
  createUser: (input) => secureApiRequest('/api/v1/users', 'POST', input),
  setUserActive: (userId, active) =>
    secureApiRequest(`/api/v1/users/${userId}/${active ? 'activate' : 'deactivate'}`, 'POST'),
  replaceUserRoles: (userId, roles) =>
    secureApiRequest(`/api/v1/users/${userId}/roles`, 'PUT', { roles }),
  resetUserPassword: (userId, newPassword) =>
    secureApiRequest(`/api/v1/users/${userId}/reset-password`, 'POST', { newPassword }),
  listOfferings: (barberId) => apiRequest(`/api/v1/barbers/${barberId}/offerings`),
  listCommissionRules: (barberId) => apiRequest(`/api/v1/barbers/${barberId}/commission-rules`),
  createStaff: (input) => secureApiRequest('/api/v1/staff', 'POST', input),
  updateStaff: (staff, active) =>
    secureApiRequest(`/api/v1/staff/${staff.id}`, 'PATCH', { ...staff, active }),
  createBarber: (input) => secureApiRequest('/api/v1/barbers', 'POST', input),
  updateBarber: (barber, active) =>
    secureApiRequest(`/api/v1/barbers/${barber.id}`, 'PATCH', { ...barber, active }),
  createService: (input) => secureApiRequest('/api/v1/services', 'POST', input),
  updateService: (service, active) =>
    secureApiRequest(`/api/v1/services/${service.id}`, 'PATCH', { ...service, active }),
  createOffering: (barberId, input) =>
    secureApiRequest(`/api/v1/barbers/${barberId}/offerings`, 'POST', input),
  deactivateOffering: (offering) =>
    secureApiRequest(
      `/api/v1/barbers/${offering.barberId}/offerings/${offering.id}/deactivate`,
      'POST',
      { version: offering.version },
    ),
  createProduct: (input) => secureApiRequest('/api/v1/products', 'POST', input),
  updateProduct: (product, active) =>
    secureApiRequest(`/api/v1/products/${product.id}`, 'PATCH', { ...product, active }),
  createCommissionRule: (barberId, input) =>
    secureApiRequest(`/api/v1/barbers/${barberId}/commission-rules`, 'POST', input),
  deactivateCommissionRule: (rule) =>
    secureApiRequest(
      `/api/v1/barbers/${rule.barberId}/commission-rules/${rule.id}/deactivate`,
      'POST',
      { version: rule.version },
    ),
  createExpenseCategory: (name) => secureApiRequest('/api/v1/expense-categories', 'POST', { name }),
  updateExpenseCategory: (category, active) =>
    secureApiRequest(`/api/v1/expense-categories/${category.id}`, 'PATCH', { ...category, active }),
}
