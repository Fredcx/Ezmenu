
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ASAAS_API_URL = "https://api.asaas.com/v3"
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const { order_id, amount, customer, split_percent, wallet_id } = await req.json()

        if (!ASAAS_API_KEY) {
            throw new Error("ASAAS_API_KEY not configured")
        }

        // 1. Buscar ou Criar Cliente
        // Procuramos por email ou CPF/CNPJ
        let customerId = "";
        const searchResponse = await fetch(`${ASAAS_API_URL}/customers?email=${customer.email}`, {
            headers: { "access_token": ASAAS_API_KEY }
        });
        const searchData = await searchResponse.json();

        if (searchData.data && searchData.data.length > 0) {
            customerId = searchData.data[0].id;
        } else {
            const createCustomerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "access_token": ASAAS_API_KEY
                },
                body: JSON.stringify({
                    name: customer.name,
                    email: customer.email,
                    cpfCnpj: customer.cpfCnpj?.replace(/\D/g, ""),
                    mobilePhone: customer.phone?.replace(/\D/g, "")
                })
            });
            const newCustomer = await createCustomerResponse.json();
            if (!createCustomerResponse.ok) throw new Error(`Erro ao criar cliente: ${JSON.stringify(newCustomer)}`);
            customerId = newCustomer.id;
        }

        // 2. Criar Cobrança (Pix) - Direto para a conta do API Key
        const paymentPayload: any = {
            customer: customerId,
            billingType: "PIX",
            value: amount,
            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Amanhã
            description: `Pedido EzMenu - ID: ${order_id}`,
            externalReference: order_id,
        };

        const createPaymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "access_token": ASAAS_API_KEY
            },
            body: JSON.stringify(paymentPayload)
        });

        const paymentData = await createPaymentResponse.json();
        if (!createPaymentResponse.ok) throw new Error(`Erro ao criar cobrança: ${JSON.stringify(paymentData)}`);

        // 3. Obter QR Code do Pix
        const pixQrResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
            headers: { "access_token": ASAAS_API_KEY }
        });
        const pixData = await pixQrResponse.json();

        return new Response(JSON.stringify({
            payment_id: paymentData.id,
            pix_qr_code: pixData.encodedImage,
            pix_copy_paste: pixData.payload,
            status: paymentData.status,
            amount: paymentData.value,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })

    } catch (error) {
        console.error("Asaas Payment Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    }
})
