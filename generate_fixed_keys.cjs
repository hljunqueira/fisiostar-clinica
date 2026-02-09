const crypto = require('crypto');
const fs = require('fs');

// Segredo simples e robusto para evitar erros de caractere
const secret = 'bjXqXaWKIXUsi0GBNJW8mcyqb50v7oog';

function base64url(source) {
    let encoded = Buffer.from(JSON.stringify(source)).toString('base64');
    return encoded.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function sign(payload, secret) {
    const header = base64url({ alg: "HS256", typ: "JWT" });
    const data = header + "." + base64url(payload);
    const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    return data + "." + signature;
}

// Expiração fixa em 2040 para simplificar
const exp = 2210000000;

const anon_payload = {
    role: "anon",
    iss: "supabase",
    iat: 1770000000,
    exp: exp,
    aud: "authenticated"
};

const service_payload = {
    role: "service_role",
    iss: "supabase",
    iat: 1770000000,
    exp: exp,
    aud: "authenticated"
};

const anon_key = sign(anon_payload, secret);
const service_role_key = sign(service_payload, secret);

const output = `JWT_SECRET=${secret}
ANON_KEY=${anon_key}
SERVICE_ROLE_KEY=${service_role_key}`;

fs.writeFileSync('keys_final_v2.txt', output);
console.log('--- KEYS GENERATED ---');
console.log(output);
