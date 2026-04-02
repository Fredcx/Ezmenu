
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const PAGARME_API_URL = "https://api.pagar.me/core/v5/orders"
const PAGARME_SECRET_KEY = Deno.env.get("PAGARME_SECRET_KEY")

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const { order_id, amount, customer, payment_method } = await req.json()

        if (payment_method !== "pix") {
            return new Response(JSON.stringify({ error: "Only Pix supported for now" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
        }

        if (!PAGARME_SECRET_KEY) {
            return new Response(JSON.stringify({ error: "Pagar.me API Key not configured in Edge Function environment" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
        }

        // Pagar.me expects amount in cents
        const amountInCents = Math.round(amount * 100)

        // Parse phone number
        const cleanPhone = (customer.phone || "").replace(/\D/g, "");
        const areaCode = cleanPhone.substring(0, 2) || "11";
        const number = cleanPhone.substring(2) || "999999999";

        const payload = {
            metadata: {
                order_id: order_id || "N/A",
            },
            items: [
                {
                    amount: amountInCents,
                    description: `Pedido na Mesa B4`,
                    quantity: 1,
                },
            ],
            customer: {
                name: customer.name || "Cliente",
                email: customer.email || "cliente@exemplo.com",
                document: customer.document || "00000000000",
                type: "individual",
                phones: {
                    mobile_phone: {
                        country_code: "55",
                        area_code: areaCode,
                        number: number
                    }
                }
            },
            payments: [
                {
                    payment_method: "pix",
                    pix: {
                        expires_in: 3600, // 1 hour
                        additional_information: [
                            {
                                name: "Order ID",
                                value: order_id || "N/A",
                            },
                        ],
                    },
                },
            ],
        }

        const response = await fetch(PAGARME_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${btoa(PAGARME_SECRET_KEY + ":")}`,
            },
            body: JSON.stringify(payload),
        })

        const data = await response.json()

        if (!response.ok) {
            return new Response(JSON.stringify({ error: data }), {
                status: response.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
        }

        // Response structure for Pix in Pagar.me V5 Orders
        const payment = data.payments?.[0];
        const pixData = payment?.pix_qr_code;

        return new Response(JSON.stringify({
            order_id: data.id,
            pix_qr_code: pixData?.text || "",
            pix_qr_code_url: pixData?.qrcode_url || "",
            pix_expiration_date: payment?.pix_expiration_date || "",
            status: data.status,
            raw: data
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    }
})
