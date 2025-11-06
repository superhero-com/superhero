const fs = require('fs');
const path = require('path');

// Define the path to the package.json file
const packageJsonPath = path.join(
  __dirname,
  '../node_modules/bctsl-sdk',
  'package.json',
);

// Check if package exists
if (!fs.existsSync(packageJsonPath)) {
  console.warn('Warning: bctsl-sdk package.json not found. Skipping package type update.');
  process.exit(0);
}

try {
  // Read the package.json file synchronously
  const data = fs.readFileSync(packageJsonPath, 'utf8');

  // Parse the JSON data
  const packageJson = JSON.parse(data);

  // Only update if needed
  if (packageJson.type === 'module') {
    // Change type to commonjs
    packageJson.type = 'commonjs';
    
    // Also update main to point to CJS version for better compatibility
    if (packageJson.main === './.build/esm/index.js') {
      packageJson.main = './.build/cjs/index.js';
    }

    // Update exports.default to point to CJS version
    if (packageJson.exports && packageJson.exports['.'] && packageJson.exports['.'].default === './.build/esm/index.js') {
      packageJson.exports['.'].default = './.build/cjs/index.js';
    }

    // Convert the JSON object back to a string
    const updatedData = JSON.stringify(packageJson, null, 2);

    // Write the updated data back synchronously
    fs.writeFileSync(packageJsonPath, updatedData, 'utf8');
    console.log('Successfully updated bctsl-sdk package.json: type=commonjs, main and exports.default point to CJS');
  } else {
    // Even if type is already commonjs, ensure main and exports.default are correct
    let updated = false;
    if (packageJson.main === './.build/esm/index.js') {
      packageJson.main = './.build/cjs/index.js';
      updated = true;
    }
    if (packageJson.exports && packageJson.exports['.'] && packageJson.exports['.'].default === './.build/esm/index.js') {
      packageJson.exports['.'].default = './.build/cjs/index.js';
      updated = true;
    }
    if (updated) {
      const updatedData = JSON.stringify(packageJson, null, 2);
      fs.writeFileSync(packageJsonPath, updatedData, 'utf8');
      console.log('Updated bctsl-sdk package.json: main and exports.default now point to CJS');
    } else {
      console.log('bctsl-sdk package.json already has correct configuration');
    }
  }
} catch (err) {
  console.error('Error updating bctsl-sdk package.json:', err.message);
  process.exit(1);
}
