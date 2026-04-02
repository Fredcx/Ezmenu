const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const PORT = 3001;
const ASAAS_API_URL = "https://api.asaas.com/v3";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) 
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) 
    : null;

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, asaas-access-token');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
        try {
            const data = body ? JSON.parse(body) : {};

            // 1. GENERATE PAYMENT
            if (req.url === '/api/asaas-payment' && req.method === 'POST') {
                console.log("Local API: Received asaas-payment request", data.order_id);
                
                if (!ASAAS_API_KEY) {
                    // Simulated response if no API key
                    const mockPaymentId = "pay_" + Math.random().toString(36).substr(2, 9);
                    const mockResponse = {
                        payment_id: mockPaymentId,
                        pix_qr_code: "PHN2ZyB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjMDAwIi8+PC9zdmc+", // Simple black square SVG
                        pix_copy_paste: "00020126330014br.gov.bcb.pix01111234567890152040000530398654041.005802BR5913CLIENTE6009SAO PAULO62070503***6304ABCD",
                        status: "PENDING",
                        amount: data.amount
                    };
                    
                    if (supabase) {
                        await supabase.from("payments").insert({
                            order_id: data.order_id.includes('TABLE-') ? null : data.order_id,
                            asaas_id: mockPaymentId,
                            status: "PENDING",
                            amount: data.amount,
                            pix_qr_code: mockResponse.pix_qr_code,
                            pix_copy_paste: mockResponse.pix_copy_paste,
                            external_reference: data.order_id
                        });
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(mockResponse));
                    return;
                }

                // REAL ASAAS logic would go here, but since this is for local testing 
                // and the user might be using Sandbox, they can just set ASAAS_API_KEY in .env
                // ... (simplified call to Asaas)
                res.writeHead(500);
                res.end(JSON.stringify({ error: "Use vercel dev for real Asaas calls with API Key, or use simulation mode." }));
            }

            // 2. SIMULATE WEBHOOK (For local testing only)
            else if (req.url === '/api/simulate-webhook' && req.method === 'POST') {
                console.log("Local API: Simulating webhook for asaas_id:", data.asaas_id);
                
                if (!supabase) {
                    res.writeHead(500); res.end(JSON.stringify({ error: "No Supabase env vars" }));
                    return;
                }

                // Find the payment to get externalReference
                const { data: pay } = await supabase.from("payments").select("external_reference").eq("asaas_id", data.asaas_id).single();
                
                const tableId = pay?.external_reference?.startsWith("TABLE-") ? pay.external_reference.split("-")[1] : null;

                // Update Payments
                await supabase.from("payments").update({ status: "RECEIVED", updated_at: new Date().toISOString() }).eq("asaas_id", data.asaas_id);

                // Update Orders
                if (tableId) {
                    await supabase.from("orders").update({ status: "paid" }).eq("table_id", tableId).in("status", ["pending", "confirmed", "building"]);
                    console.log(`Simulated: Table ${tableId} paid.`);
                } else if (pay?.external_reference) {
                    await supabase.from("orders").update({ status: "paid" }).eq("id", pay.external_reference);
                    console.log(`Simulated: Order ${pay.external_reference} paid.`);
                }

                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
            }

            else {
                res.writeHead(404);
                res.end();
            }

        } catch (e) {
            console.error(e);
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        }
    });
});

server.listen(PORT, () => {
    console.log(`\x1b[32m🚀 Local API Server running at http://localhost:${PORT}\x1b[0m`);
    console.log(`\x1b[36m👉 Proxying calls from Vite (port 8080) to this server.\x1b[0m`);
});
