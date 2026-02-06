const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// 1. Gerar Secret Aleatorio (40 chars hex = +32)
const secret = crypto.randomBytes(32).toString('hex');

// 2. Definir Payloads
const now = Math.floor(Date.now() / 1000);
const exp = now + (10 * 365 * 24 * 60 * 60); // 10 anos

const anonPayload = {
    role: 'anon',
    iss: 'supabase',
    iat: now,
    exp: exp
};

const servicePayload = {
    role: 'service_role',
    iss: 'supabase',
    iat: now,
    exp: exp
};

// 3. Assinar Tokens
const anonKey = jwt.sign(anonPayload, secret);
const serviceKey = jwt.sign(servicePayload, secret);

console.log('--- START KEYS ---');
console.log(`JWT_SECRET=${secret}`);
console.log(`ANON_KEY=${anonKey}`);
console.log(`SERVICE_ROLE_KEY=${serviceKey}`);
console.log('--- END KEYS ---');
