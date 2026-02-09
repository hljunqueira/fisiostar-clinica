const crypto = require('crypto');

// Gerar um segredo novo e robusto
const secret = crypto.randomBytes(32).toString('hex');

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

const exp = Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60); // 10 years

const anon_key = sign({
    role: "anon",
    iss: "supabase",
    iat: Math.floor(Date.now() / 1000),
    exp: exp
}, secret);

const service_role_key = sign({
    role: "service_role",
    iss: "supabase",
    iat: Math.floor(Date.now() / 1000),
    exp: exp
}, secret);

const fs = require('fs');
const output = `--- SYNC_KEYS_START ---
JWT_SECRET=${secret}
ANON_KEY=${anon_key}
SERVICE_ROLE_KEY=${service_role_key}
--- SYNC_KEYS_END ---`;

fs.writeFileSync('keys_output.txt', output);
console.log('Chaves salvas em keys_output.txt');
