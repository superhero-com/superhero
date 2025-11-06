const fs = require('fs');
const path = require('path');

// Define the path to the package.json file
const packageJsonPath = path.join(
  __dirname,
  '../node_modules/bctsl-sdk',
  'package.json',
);

<<<<<<< HEAD
// Read the package.json file
fs.readFile(packageJsonPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading package.json:', err);
    return;
  }

  // Parse the JSON data
  let packageJson;
  try {
    packageJson = JSON.parse(data);
  } catch (err) {
    console.error('Error parsing package.json:', err);
    return;
  }

  // Modify the "type" field
  // delete packageJson.type;
  packageJson.type = 'commonjs';

  // Convert the JSON object back to a string
  const updatedData = JSON.stringify(packageJson, null, 2);

  // Write the updated data back to the package.json file
  fs.writeFile(packageJsonPath, updatedData, 'utf8', (err) => {
    if (err) {
      console.error('Error writing package.json:', err);
      return;
    }
    console.log('Successfully updated package.json to use "type": "commonjs"');
  });
});
=======
// Check if the package exists
if (!fs.existsSync(packageJsonPath)) {
  console.warn('Warning: bctsl-sdk package.json not found. Skipping package type update.');
  process.exit(0);
}

try {
  // Read the package.json file synchronously
  const data = fs.readFileSync(packageJsonPath, 'utf8');

  // Parse the JSON data
  const packageJson = JSON.parse(data);

  // Only update if type is "module"
  if (packageJson.type === 'module') {
    // Modify the "type" field
    packageJson.type = 'commonjs';

    // Convert the JSON object back to a string
    const updatedData = JSON.stringify(packageJson, null, 2);

    // Write the updated data back to the package.json file synchronously
    fs.writeFileSync(packageJsonPath, updatedData, 'utf8');
    console.log('Successfully updated bctsl-sdk package.json to use "type": "commonjs"');
  } else {
    console.log('bctsl-sdk package.json already has correct type:', packageJson.type);
  }
} catch (err) {
  console.error('Error updating bctsl-sdk package.json:', err.message);
  process.exit(1);
}
>>>>>>> 86e0b9e (chore: update build script to include package type update and add update-package-type script)
