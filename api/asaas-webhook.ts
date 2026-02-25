import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = req.body;
        const asaasAccessToken = req.headers['asaas-access-token'];
        const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;

        // Se configurado, validar o token vindo do Asaas
        if (webhookToken && asaasAccessToken !== webhookToken) {
            console.error("Webhook Token mismatch!");
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log("Asaas Webhook Received:", payload.event);

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Supabase env vars not configured in Vercel");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const event = payload.event;
        const asaasPaymentId = payload.payment.id;
        const orderId = payload.payment.externalReference;

        // 1. Update payments table
        const { error: paymentError } = await supabase
            .from("payments")
            .update({
                status: payload.payment.status,
                updated_at: new Date().toISOString()
            })
            .eq("asaas_id", asaasPaymentId);

        if (paymentError) console.error("Error updating payment:", paymentError);

        // 2. If confirmed, update order status
        if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
            const { error: orderError } = await supabase
                .from("orders")
                .update({ status: "paid" })
                .eq("id", orderId);

            if (orderError) console.error("Error updating order:", orderError);
            console.log(`Order ${orderId} marked as PAID`);
        }

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return res.status(500).json({ error: error.message || "Erro inesperado" });
    }
}
