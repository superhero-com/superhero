const fs = require('fs');
const path = require('path');

// Define the path to the package.json file
const packageJsonPath = path.join(
  __dirname,
  '../node_modules/bctsl-sdk',
  'package.json',
);

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
