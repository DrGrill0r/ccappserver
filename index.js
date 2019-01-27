"use strict";

var AWS = require('aws-sdk');

// Get "Categories" Dynamo table name.  Replace DEFAULT_VALUE 
// with the actual table name from your stack.
const categoriesDBArn = process.env['CATEGORIES_DB'] || 'CATEGORIES_TABLE'; //'Mark-HelloTable-1234567';
const categoriesDBArnArr = categoriesDBArn.split('/');
const categoriesTableName = categoriesDBArnArr[categoriesDBArnArr.length - 1];

// handleHttpRequest is the entry point for Lambda requests
exports.handleHttpRequest = function(request, context, done) {
  try {
    //const userId = request.pathParameters.userId;
    let response = {
      headers: {
        "x-custom-header": "my custom header value",
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin" : "*", // Required for CORS support to work.
        "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS.
      },
      body: '',
      statusCode: 200
    };

    switch (request.httpMethod) {
      case 'GET':
        {
          console.log('GET');
          let dynamo = new AWS.DynamoDB();
          var params = {
            TableName: categoriesTableName,
            ProjectionExpression: "category_id, category_name"
          };
          // Call DynamoDB to read the item from the table
          dynamo.scan(params, function(err, data) {
            if (err) {
              console.log("Error", err);
              throw `Dynamo Get Error (${err})`;
            }
            else {
              console.log("Success", JSON.stringify(data));
              
              var responseObject = [];
              
              for(let category of data.Items) {
                responseObject.push(
                  {
                    "category_id": category.category_id.N,
                    "category_name": category.category_name.S
                  });
              }
              
              response.body = JSON.stringify(responseObject);
              response.statusCode = 200;

              done(null, response);
            }
          });
          break;
        }
      case 'POST':
        {
          console.log('POST');
          console.log('table name ', categoriesTableName);
          let bodyJSON = JSON.parse(request.body || '{}');
          let dynamo = new AWS.DynamoDB();

          // KISS: We're doing a full replace here.
          // --- 1. Get all entries in table.
          var scanParams = {
            TableName: categoriesTableName,
            ProjectionExpression: "category_id"
          };
          dynamo.scan(scanParams).promise().then((data) => {
            console.log("Success SCAN ", JSON.stringify(data.Items));
            return data.Items;
          })
          .then((data) => {
            // --- 2. Queue in a delete request for all items.
            console.log("Success - HANDLING SCAN RESULT, the following items will be deleted ", JSON.stringify(data));

            var deleteRequests = [];

            for (let entry of data) {
              deleteRequests.push({
                DeleteRequest: {

                  //"KEY": { "N": entry.category_id.N }
                  "Key": {
                    "category_id": {
                      "N": entry.category_id.N
                    }
                  }
                }
              })
            }
            console.log("TABLENAME ", categoriesTableName);
            var deleteBatchParams = {
              RequestItems: {
                [categoriesTableName]: deleteRequests
              }
            };

            console.log("deleteBatchParams are ", JSON.stringify(deleteBatchParams));
            dynamo.batchWriteItem(deleteBatchParams, function(err, data) {
              if (err) {
                console.log("Error", err);
              }
              else {
                console.log("Success", data);
              }
            });
          }).then(() => {
            var putBatchRequests = [];

            console.log("body JSON is ", bodyJSON);

            for (let category of bodyJSON) {
              putBatchRequests.push({
                PutRequest: {
                  Item: {
                    "category_id": { "N": category.category_id.toString() },
                    "category_name": { "S": category.category_name }
                  }
                }
              });
              
              response.body = request.body;
            }

            let putBatchParams = {
              "RequestItems": {
                "ccstack-CategoriesTable-ZU09ZSL6G3CJ": putBatchRequests
              }
            };

            console.log("putBatchParams are ", JSON.stringify(putBatchParams));

            dynamo.batchWriteItem(putBatchParams, function(error, data) {
              if (error) throw `Dynamo Error (${error})`;
              else done(null, response);
            });
            
            done(null, response);
          }).catch((err) => {
            if (err) {
              console.log(err);
            }

          });
          // dynamo.scan(scanParams, function(err, data) {
          //   if (err) {
          //     console.log("Error", err);
          //     throw `Dynamo Scan Error (${err})`;
          //   } else {
          //     entriesToDelete = data.Items;
          //     console.log("Success SCAN ", JSON.stringify(data.Items));
          //     done(null, entriesToDelete);
          //   }
          // });

          break;
        }
    }
  }
  catch (e) {
    done(e, null);
  }
}
