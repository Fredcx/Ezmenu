import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, asaas-access-token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

        // 1. Update payments table and get the record for isolation
        const { data: payRecord, error: paymentError } = await supabase
            .from("payments")
            .update({
                status: payload.payment.status,
                updated_at: new Date().toISOString()
            })
            .eq("asaas_id", asaasPaymentId)
            .select("establishment_id")
            .single();

        if (paymentError) console.error("Error updating payment:", paymentError);
        const estId = payRecord?.establishment_id;

        // 2. If confirmed, update order status
        if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
            if (orderId && orderId.startsWith("TABLE-")) {
                const parts = orderId.split("-");
                const tableId = parts[1];
                console.log(`Processing TABLE payment for table: ${tableId} at Est: ${estId}`);

                const query = supabase
                    .from("orders")
                    .update({ status: "paid" })
                    .eq("table_id", tableId)
                    .not("status", "in", "(paid,archived,cancelled)");

                if (estId) {
                    query.eq("establishment_id", estId);
                }

                const { error: orderError } = await query;
                if (orderError) console.error("Error updating table orders:", orderError);
                
                // 3. Close the table ("Mesa fecha" logic)
                console.log(`Closing table ${tableId} for Est: ${estId}`);
                
                // Try update by ID first (assuming tableId in orderId is the ID)
                const { data: tableById, error: tableIdError } = await supabase
                    .from("restaurant_tables")
                    .update({ 
                        status: "free",
                        occupants: [],
                        last_activity_at: new Date().toISOString()
                    })
                    .eq("id", tableId)
                    .select();

                if (tableIdError) console.error("Error closing table by ID:", tableIdError);
                
                if (!tableById || tableById.length === 0) {
                    console.log(`Table with ID ${tableId} not found or not updated. Trying by NAME...`);
                    const tableQuery = supabase
                        .from("restaurant_tables")
                        .update({ 
                            status: "free",
                            occupants: [],
                            last_activity_at: new Date().toISOString()
                        })
                        .eq("name", tableId); // TABLE-M1-... parts[1] is "M1"

                    if (estId) {
                        tableQuery.eq("establishment_id", estId);
                    }

                    const { data: tableByName, error: tableNameError } = await tableQuery.select();
                    if (tableNameError) console.error("Error closing table by name:", tableNameError);
                    if (tableByName && tableByName.length > 0) {
                        console.log(`Table ${tableId} closed by NAME.`);
                    } else {
                        console.warn(`Could not find table ${tableId} by ID or NAME to close.`);
                    }
                } else {
                    console.log(`Table ${tableId} closed by ID.`);
                }
            } else {
                const { error: orderError } = await supabase
                    .from("orders")
                    .update({ status: "paid" })
                    .eq("id", orderId);

                if (orderError) console.error("Error updating order:", orderError);
                console.log(`Order ${orderId} marked as PAID`);
            }
        }

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return res.status(500).json({ error: error.message || "Erro inesperado" });
    }
}
