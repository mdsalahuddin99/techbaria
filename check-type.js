const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules', '.prisma', 'client', 'index.d.ts');
const content = fs.readFileSync(filePath, 'utf-8');

const regex = /export type ProductWhereInput = \{([\s\S]*?)\}/;
const match = content.match(regex);
if (match) {
    fs.writeFileSync(path.join(__dirname, 'check-output.txt'), match[0]);
} else {
    fs.writeFileSync(path.join(__dirname, 'check-output.txt'), "Could not find ProductWhereInput");
}
