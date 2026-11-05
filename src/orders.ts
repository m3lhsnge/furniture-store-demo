export type Order = { id: string; order_number: string; customer_name: string; address: string; phone: string; total_amount: number; status: string; created_at: string; items: { name: string; quantity: number; finish: string }[] }
export const stages = ['Alındı', 'Hazırlanıyor', 'Kargoda', 'Teslim Edildi']
