const muhammara = require('muhammara');
const fs = require('fs');

const inFile = process.argv[2];
const outFile = process.argv[3];
const password = process.argv[4];
const ownerPassword = process.argv[5];
const userPassword = process.argv[6];

try {
  muhammara.recrypt(inFile, outFile, {
    password: password === 'EMPTY' ? '' : password,
    userPassword: userPassword,
    ownerPassword: ownerPassword,
    userProtectionFlag: 4
  });
  process.exit(0);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
