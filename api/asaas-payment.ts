import type { VercelRequest, VercelResponse } from '@vercel/node';

const ASAAS_API_URL = "https://api.asaas.com/v3";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { order_id, amount, customer } = req.body;

        if (!ASAAS_API_KEY) {
            throw new Error("ASAAS_API_KEY not configured in Vercel environment variables");
        }

        // 1. Find or Create Customer
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

        // 2. Create Charge (Pix)
        const paymentPayload = {
            customer: customerId,
            billingType: "PIX",
            value: amount,
            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
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

        // 3. Get Pix QR Code
        const pixQrResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
            headers: { "access_token": ASAAS_API_KEY }
        });
        const pixData = await pixQrResponse.json();

        return res.status(200).json({
            payment_id: paymentData.id,
            pix_qr_code: pixData.encodedImage,
            pix_copy_paste: pixData.payload,
            status: paymentData.status,
            amount: paymentData.value,
        });

    } catch (error: any) {
        console.error("Asaas Payment Error:", error);
        return res.status(500).json({ error: error.message || "Erro inesperado" });
    }
}
