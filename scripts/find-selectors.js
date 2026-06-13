const fs = require('fs');

const css = fs.readFileSync('c:/Users/Ger11/Downloads/Gallos/empleado/empleado.css', 'utf8');
const regex = /(\.pb-reparte|\.pb-add-row|\.btn-add-ap)\s*\{([^}]+)\}/g;
let match;
while ((match = regex.exec(css)) !== null) {
  console.log(`Selector: ${match[1]}`);
  console.log(`Content:\n${match[2].trim()}\n`);
}
