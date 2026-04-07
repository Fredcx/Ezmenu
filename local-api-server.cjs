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
                console.log("\x1b[33m[LOCAL API]\x1b[0m Received asaas-payment request for:", data.order_id);
                
                if (!ASAAS_API_KEY) {
                    console.log("\x1b[34m[LOCAL API]\x1b[0m ASAAS_API_KEY missing - Using SIMULATION mode.");
                    // Simulated response if no API key
                    const mockPaymentId = "pay_" + Math.random().toString(36).substr(2, 9);
                    const mockResponse = {
                        payment_id: mockPaymentId,
                        pix_qr_code: "PHN2ZyB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjMDAwIi8+PC9zdmc+",
                        pix_copy_paste: "00020126330014br.gov.bcb.pix01111234567890152040000530398654041.005802BR5913CLIENTE6009SAO PAULO62070503***6304ABCD",
                        status: "PENDING",
                        amount: data.amount
                    };
                    
                    if (supabase) {
                        try {
                            const { error: insError } = await supabase.from("payments").insert({
                                order_id: data.order_id.includes('TABLE-') ? null : data.order_id,
                                asaas_id: mockPaymentId,
                                status: "PENDING",
                                amount: data.amount,
                                pix_qr_code: mockResponse.pix_qr_code,
                                pix_copy_paste: mockResponse.pix_copy_paste,
                                external_reference: data.order_id,
                                establishment_id: data.establishment_id
                            });
                            if (insError) console.error("\x1b[31m[SUPABASE ERROR]\x1b[0m", insError.message);
                            else console.log("\x1b[32m[LOCAL API]\x1b[0m Mock payment recorded in Supabase.");
                        } catch (err) {
                            console.error("\x1b[31m[DB ERROR]\x1b[0m", err.message);
                        }
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(mockResponse));
                    return;
                }

                // REAL ASAAS logic mirrored from api/asaas-payment.ts
                try {
                    const { amount, customer, establishment_id, order_id } = data;

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
                        if (!createCustomerResponse.ok) throw new Error(`Erro ao criar cliente Asaas: ${JSON.stringify(newCustomer)}`);
                        customerId = newCustomer.id;
                    }

                    // 2. Create Charge (Pix)
                    const createPaymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "access_token": ASAAS_API_KEY
                        },
                        body: JSON.stringify({
                            customer: customerId,
                            billingType: "PIX",
                            value: amount,
                            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                            description: `Pedido EzMenu - ID: ${order_id}`,
                            externalReference: order_id,
                        })
                    });

                    const paymentData = await createPaymentResponse.json();
                    if (!createPaymentResponse.ok) throw new Error(`Erro ao criar cobrança Asaas: ${JSON.stringify(paymentData)}`);

                    // 3. Get Pix QR Code
                    const pixQrResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
                        headers: { "access_token": ASAAS_API_KEY }
                    });
                    const pixData = await pixQrResponse.json();

                    // 4. Record in local database
                    if (supabase) {
                        await supabase.from("payments").insert({
                            order_id: order_id.includes('TABLE-') ? null : order_id,
                            external_reference: order_id,
                            establishment_id: establishment_id,
                            asaas_id: paymentData.id,
                            status: paymentData.status,
                            amount: paymentData.value,
                            pix_qr_code: pixData.encodedImage,
                            pix_copy_paste: pixData.payload
                        });
                        console.log("\x1b[32m[LOCAL API]\x1b[0m Real Asaas payment recorded in Supabase.");
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        payment_id: paymentData.id,
                        pix_qr_code: pixData.encodedImage,
                        pix_copy_paste: pixData.payload,
                        status: paymentData.status,
                        amount: paymentData.value,
                    }));

                } catch (asaasErr) {
                    console.error("\x1b[31m[ASAAS ERROR]\x1b[0m", asaasErr.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: asaasErr.message }));
                }
            }

            // 1.5 CREATE STAFF MEMEBER (Mirrors Vercel API using Admin SDK)
            else if (req.url === '/api/create-staff' && req.method === 'POST') {
                console.log("\x1b[36m[LOCAL API]\x1b[0m Creating staff via Admin SDK for:", data.email);
                
                if (!supabase) {
                     res.writeHead(500); res.end(JSON.stringify({ error: "No Supabase env vars" }));
                     return;
                }

                try {
                    const { email, password, full_name, establishment_id } = data;

                    // 1. Try to create the user cleanly using official SDK
                    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
                        email,
                        password,
                        email_confirm: true,
                        user_metadata: { full_name: full_name || 'Staff' }
                    });

                    let userId = userData?.user?.id;

                    if (createError) {
                        // 2. Fallback to updating if already exists
                        if (createError.message.includes("registered") || createError.status === 422) {
                            const { data: users } = await supabase.auth.admin.listUsers();
                            const existing = users?.users.find(u => u.email === email);
                            if (existing) {
                                userId = existing.id;
                                await supabase.auth.admin.updateUserById(userId, {
                                    password: password,
                                    user_metadata: { full_name: full_name || 'Staff' },
                                    email_confirm: true
                                });
                                console.log("\x1b[33m[LOCAL API]\x1b[0m Existing user updated:", email);
                            } else {
                                throw createError;
                            }
                        } else {
                            throw createError;
                        }
                    }

                    if (!userId) throw new Error("Could not create/retrieve user");

                    // 3. Upsert Profile
                    const { error: profileError } = await supabase.from('profiles').upsert({
                        id: userId,
                        email,
                        full_name: full_name,
                        role: 'waiter',
                        establishment_id
                    });

                    if (profileError) throw profileError;

                    console.log("\x1b[32m[LOCAL API]\x1b[0m Staff created successfully.");
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, user_id: userId }));

                } catch (err) {
                    console.error("\x1b[31m[CREATE ERROR]\x1b[0m", err.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
            }

            // 2. SIMULATE WEBHOOK (For local testing only)
            else if (req.url === '/api/simulate-webhook' && req.method === 'POST') {
                console.log("\x1b[35m[LOCAL API]\x1b[0m Simulating webhook for asaas_id:", data.asaas_id);
                
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
                    console.log(`\x1b[32m[SIMULATION]\x1b[0m Table ${tableId} mark as PAID.`);
                } else if (pay?.external_reference) {
                    await supabase.from("orders").update({ status: "paid" }).eq("id", pay.external_reference);
                    console.log(`\x1b[32m[SIMULATION]\x1b[0m Order ${pay.external_reference} marked as PAID.`);
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
