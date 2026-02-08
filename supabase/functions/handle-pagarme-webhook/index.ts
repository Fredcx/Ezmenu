
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        console.log("Webhook received:", payload.type)

        // Pagar.me V5 Webhook logic
        if (payload.type === "order.paid") {
            const internalOrderId = payload.data.metadata?.order_id

            // The order_id was formatted as `TABLE-${tableName}-${timestamp}` in process-payment
            const tableIdMatch = (internalOrderId || "").match(/^TABLE-(.+)-\d+$/)
            const tableId = tableIdMatch ? tableIdMatch[1] : null

            if (tableId) {
                console.log(`Order paid for table ${tableId}. Updating database...`)

                // 1. Update all orders for this table to 'completed'
                const { error: orderError } = await supabase
                    .from('orders')
                    .update({ status: 'completed' })
                    .eq('table_id', tableId)
                    .neq('status', 'completed')

                if (orderError) throw orderError

                // 2. We could also log the payment in a 'payments' table if it existed
                console.log(`Successfully completed all orders for table ${tableId}`)
            } else {
                console.warn("Table ID not found in metadata. Order ID:", internalOrderId)
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        console.error("Webhook error:", errorMessage)
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    }
})
