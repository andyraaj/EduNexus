const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret-value-with-length';

const {
    generateAccessToken,
    generateRefreshToken,
} = require('../server/services/authService');

test('generateAccessToken returns a signed JWT string', () => {
    const token = generateAccessToken('507f1f77bcf86cd799439011', 'admin');
    assert.equal(typeof token, 'string');
    assert.equal(token.split('.').length, 3);
});

test('generateRefreshToken returns high-entropy unique opaque values', () => {
    const first = generateRefreshToken();
    const second = generateRefreshToken();
    assert.equal(first.length, 80);
    assert.equal(second.length, 80);
    assert.notEqual(first, second);
});

test('refresh token hashes do not reveal the original token', async () => {
    const token = generateRefreshToken();
    const hash = await bcrypt.hash(token, 8);
    assert.notEqual(hash, token);
    assert.equal(await bcrypt.compare(token, hash), true);
});
