// ============ Theme Toggle ============
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const savedTheme = localStorage.getItem('theme') || 'dark';
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('theme', next);
});

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  themeIcon.textContent = t === 'dark' ? '☀️' : '🌙';
}

// ============ Tabs ============
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ============ Helpers ============
function setOutput(id, value) { document.getElementById(id).value = value; }
function getVal(id) { return document.getElementById(id).value; }
function copyOutput(id) {
  const el = document.getElementById(id);
  if (!el.value) return;
  navigator.clipboard.writeText(el.value);
  flash(el);
}
function clearFields(ids) { ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); }
function flash(el) {
  el.style.transition = 'border-color .15s';
  const orig = el.style.borderColor;
  el.style.borderColor = 'var(--accent)';
  setTimeout(() => { el.style.borderColor = orig; }, 400);
}
function showError(id, err) { setOutput(id, 'Error: ' + (err.message || err)); }

const MODE_MAP = {
  CBC: CryptoJS.mode.CBC, ECB: CryptoJS.mode.ECB,
  CFB: CryptoJS.mode.CFB, OFB: CryptoJS.mode.OFB, CTR: CryptoJS.mode.CTR
};

// ============ AES ============
function aesEncrypt() {
  try {
    const key = getVal('aes-key'); const text = getVal('aes-input');
    if (!key || !text) throw new Error('Key and input required');
    const mode = MODE_MAP[getVal('aes-mode')];
    const keySize = parseInt(getVal('aes-keysize')) / 32;
    const salt = CryptoJS.lib.WordArray.random(8);
    const iv = CryptoJS.lib.WordArray.random(16);
    const derived = CryptoJS.PBKDF2(key, salt, { keySize, iterations: 1000 });
    const encrypted = CryptoJS.AES.encrypt(text, derived, { iv, mode, padding: CryptoJS.pad.Pkcs7 });
    const combined = salt.concat(iv).concat(encrypted.ciphertext);
    setOutput('aes-output', CryptoJS.enc.Base64.stringify(combined));
  } catch (e) { showError('aes-output', e); }
}
function aesDecrypt() {
  try {
    const key = getVal('aes-key'); const text = getVal('aes-input');
    if (!key || !text) throw new Error('Key and input required');
    const mode = MODE_MAP[getVal('aes-mode')];
    const keySize = parseInt(getVal('aes-keysize')) / 32;
    const combined = CryptoJS.enc.Base64.parse(text);
    const words = combined.words;
    const salt = CryptoJS.lib.WordArray.create(words.slice(0, 2));
    const iv = CryptoJS.lib.WordArray.create(words.slice(2, 6));
    const ct = CryptoJS.lib.WordArray.create(words.slice(6), combined.sigBytes - 24);
    const derived = CryptoJS.PBKDF2(key, salt, { keySize, iterations: 1000 });
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: ct }, derived, { iv, mode, padding: CryptoJS.pad.Pkcs7 });
    setOutput('aes-output', decrypted.toString(CryptoJS.enc.Utf8));
  } catch (e) { showError('aes-output', e); }
}

// ============ DES / 3DES helper ============
function symEncrypt(algo, keyId, modeId, inputId, outputId) {
  try {
    const key = getVal(keyId); const text = getVal(inputId);
    if (!key || !text) throw new Error('Key and input required');
    const mode = MODE_MAP[getVal(modeId)];
    const keyWA = CryptoJS.enc.Utf8.parse(key.padEnd(algo === CryptoJS.TripleDES ? 24 : 8).slice(0, algo === CryptoJS.TripleDES ? 24 : 8));
    const iv = CryptoJS.lib.WordArray.random(8);
    const enc = algo.encrypt(text, keyWA, { iv, mode, padding: CryptoJS.pad.Pkcs7 });
    const combined = (mode === CryptoJS.mode.ECB) ? enc.ciphertext : iv.concat(enc.ciphertext);
    setOutput(outputId, CryptoJS.enc.Base64.stringify(combined));
  } catch (e) { showError(outputId, e); }
}
function symDecrypt(algo, keyId, modeId, inputId, outputId) {
  try {
    const key = getVal(keyId); const text = getVal(inputId);
    if (!key || !text) throw new Error('Key and input required');
    const mode = MODE_MAP[getVal(modeId)];
    const isTriple = algo === CryptoJS.TripleDES;
    const keyWA = CryptoJS.enc.Utf8.parse(key.padEnd(isTriple ? 24 : 8).slice(0, isTriple ? 24 : 8));
    const combined = CryptoJS.enc.Base64.parse(text);
    let iv, ct;
    if (mode === CryptoJS.mode.ECB) {
      iv = CryptoJS.lib.WordArray.create([0,0]);
      ct = combined;
    } else {
      iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 2));
      ct = CryptoJS.lib.WordArray.create(combined.words.slice(2), combined.sigBytes - 8);
    }
    const dec = algo.decrypt({ ciphertext: ct }, keyWA, { iv, mode, padding: CryptoJS.pad.Pkcs7 });
    setOutput(outputId, dec.toString(CryptoJS.enc.Utf8));
  } catch (e) { showError(outputId, e); }
}

function desEncrypt()  { symEncrypt(CryptoJS.DES, 'des-key', 'des-mode', 'des-input', 'des-output'); }
function desDecrypt()  { symDecrypt(CryptoJS.DES, 'des-key', 'des-mode', 'des-input', 'des-output'); }
function tdesEncrypt() { symEncrypt(CryptoJS.TripleDES, 'tdes-key', 'tdes-mode', 'tdes-input', 'tdes-output'); }
function tdesDecrypt() { symDecrypt(CryptoJS.TripleDES, 'tdes-key', 'tdes-mode', 'tdes-input', 'tdes-output'); }

// ============ RC4 ============
function rc4Encrypt() {
  try {
    const key = getVal('rc4-key'); const text = getVal('rc4-input');
    if (!key || !text) throw new Error('Key and input required');
    setOutput('rc4-output', CryptoJS.RC4.encrypt(text, key).toString());
  } catch (e) { showError('rc4-output', e); }
}
function rc4Decrypt() {
  try {
    const key = getVal('rc4-key'); const text = getVal('rc4-input');
    if (!key || !text) throw new Error('Key and input required');
    const dec = CryptoJS.RC4.decrypt(text, key);
    setOutput('rc4-output', dec.toString(CryptoJS.enc.Utf8));
  } catch (e) { showError('rc4-output', e); }
}

// ============ RSA ============
function rsaGenerate() {
  try {
    const size = parseInt(getVal('rsa-keysize'));
    const crypt = new JSEncrypt({ default_key_size: size });
    crypt.getKey();
    setOutput('rsa-pub', crypt.getPublicKey());
    setOutput('rsa-priv', crypt.getPrivateKey());
  } catch (e) { showError('rsa-output', e); }
}
function rsaEncrypt() {
  try {
    const pub = getVal('rsa-pub'); const text = getVal('rsa-input');
    if (!pub || !text) throw new Error('Public key and input required');
    const crypt = new JSEncrypt();
    crypt.setPublicKey(pub);
    const result = crypt.encrypt(text);
    if (!result) throw new Error('Encryption failed (input may be too long for key size)');
    setOutput('rsa-output', result);
  } catch (e) { showError('rsa-output', e); }
}
function rsaDecrypt() {
  try {
    const priv = getVal('rsa-priv'); const text = getVal('rsa-input');
    if (!priv || !text) throw new Error('Private key and input required');
    const crypt = new JSEncrypt();
    crypt.setPrivateKey(priv);
    const result = crypt.decrypt(text);
    if (result === false || result === null) throw new Error('Decryption failed');
    setOutput('rsa-output', result);
  } catch (e) { showError('rsa-output', e); }
}

// ============ ECDSA (Web Crypto) ============
async function ecdsaGenerate() {
  try {
    const curve = getVal('ecdsa-curve');
    const kp = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: curve }, true, ['sign', 'verify']
    );
    const pub = await crypto.subtle.exportKey('jwk', kp.publicKey);
    const priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
    setOutput('ecdsa-pub', JSON.stringify(pub, null, 2));
    setOutput('ecdsa-priv', JSON.stringify(priv, null, 2));
  } catch (e) { showError('ecdsa-output', e); }
}
function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64ToBuf(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
function hashForCurve(curve) {
  return curve === 'P-256' ? 'SHA-256' : curve === 'P-384' ? 'SHA-384' : 'SHA-512';
}
async function ecdsaSign() {
  try {
    const priv = getVal('ecdsa-priv'); const msg = getVal('ecdsa-input');
    if (!priv || !msg) throw new Error('Private key and message required');
    const jwk = JSON.parse(priv);
    const curve = getVal('ecdsa-curve');
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: curve }, false, ['sign']);
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: hashForCurve(curve) }, key, new TextEncoder().encode(msg));
    setOutput('ecdsa-sig', bufToB64(sig));
    setOutput('ecdsa-output', '✓ Signed');
  } catch (e) { showError('ecdsa-output', e); }
}
async function ecdsaVerify() {
  try {
    const pub = getVal('ecdsa-pub'); const msg = getVal('ecdsa-input'); const sig = getVal('ecdsa-sig');
    if (!pub || !msg || !sig) throw new Error('Public key, message, and signature required');
    const jwk = JSON.parse(pub);
    const curve = getVal('ecdsa-curve');
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: curve }, false, ['verify']);
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: hashForCurve(curve) }, key,
      b64ToBuf(sig), new TextEncoder().encode(msg)
    );
    setOutput('ecdsa-output', ok ? '✓ Signature valid' : '✗ Signature invalid');
  } catch (e) { showError('ecdsa-output', e); }
}
