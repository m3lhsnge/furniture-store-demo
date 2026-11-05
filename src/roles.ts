export const roleLabel = (role: string) => role === 'developer' ? 'Geliştirici' : ['admin','staff'].includes(role) ? 'Yetkili' : 'Müşteri'
export const isOperator = (role: string) => ['admin','staff','developer'].includes(role)
