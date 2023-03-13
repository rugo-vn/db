import CryptoJS from 'crypto-js';

export const encrypt = function (plainText, key) {
  return CryptoJS.AES.encrypt(plainText, key).toString();
};

export const decrypt = function (cipherText, key) {
  return CryptoJS.AES.decrypt(cipherText, key).toString(CryptoJS.enc.Utf8);
};

export const hash = function (payload) {
  return CryptoJS.SHA256(payload);
};

export function Secure(globalKey) {
  this.globalKey = globalKey;
}

Secure.prototype.encrypt = encrypt;
Secure.prototype.decrypt = decrypt;
Secure.prototype.hash = hash;

Secure.encrypt = encrypt;
Secure.decrypt = decrypt;
Secure.hash = hash;
