
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

serve(async (req: Request) => {
    try {
        const payload = await req.json()
        console.log("Asaas Webhook Received:", payload.event);

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Supabase env vars not configured")
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        const event = payload.event;
        const asaasPaymentId = payload.payment.id;
        const orderId = payload.payment.externalReference;

        // Atualizar tabela de pagamentos
        const { error: paymentError } = await supabase
            .from("payments")
            .update({
                status: payload.payment.status,
                updated_at: new Date().toISOString()
            })
            .eq("asaas_id", asaasPaymentId);

        if (paymentError) console.error("Error updating payment:", paymentError);

        // Se o pagamento foi confirmado ou recebido
        if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
            // Atualizar status do pedido
            const { error: orderError } = await supabase
                .from("orders")
                .update({ status: "paid" })
                .eq("id", orderId);

            if (orderError) console.error("Error updating order:", orderError);

            // Opcional: Notificar cozinha ou outros sistemas
            console.log(`Order ${orderId} marked as PAID`);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (error) {
        console.error("Webhook Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        })
    }
})
