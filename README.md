# paytm-checksum-generator-nodejs

## Firebase Installation
1. Copy both the index.js and package.json into the functions folder
2. Deploy to cloud functions
3. Send POST request to the http endpoint with the paytm order parameters as the data object. The reponse will a single string containing the generated checksum

## Nodejs Installation
1. Copy the contents of index.js to a seperate file.
2. Remove the generate checksum function at the end of the file.
3. Export the genchecksum and verifychecksum functions at the end of the file.
4. Call the two functions as needed by including a reference to the newly created source.
