const AWS = require('aws-sdk');
AWS.config.update( {
  region: 'us-east-1'
});
//Call to the client to get the data of Dynamo
const dynamodb = new AWS.DynamoDB.DocumentClient();
//Call the table created in DynamoDB
const dynamodbTableName = 'Animales';
//Path to call in Postman
const animalsPath = '/animals';

//Function to call the methods 
exports.handler = async function(event) {
  console.log('Request event: ', event);
  let response;
  switch(true) {
    case event.httpMethod === 'GET' && event.path === animalsPath:
      response = await getAnimals();
      break;
    case event.httpMethod === 'POST' && event.path === animalsPath:
      response = await saveProduct(JSON.parse(event.body));
      break;
    case event.httpMethod === 'PUT' && event.path === animalsPath:
      const requestBody = JSON.parse(event.body);
      response = await modifyProduct(requestBody.id, requestBody.updateKey, requestBody.updateValue );
      break;
    case event.httpMethod === 'DELETE' && event.path === animalsPath:
      response = await deleteProduct(JSON.parse(event.body).id);
      break;
    default:
      response = buildResponse(404, '404 Not Found');
  }
  return response;
}

//Get data from table of animals
async function getAnimals() {
  const params = {
    TableName: dynamodbTableName
  }
  const allAnimals = await scanDynamoRecords(params, []);
  const body = {
    animals: allAnimals
  }
  return buildResponse(200, body);
}


async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch(error) {
    console.error('Error al obtener los datos: ', error);
  }
}

//Function to create the animal
async function saveProduct(requestBody) {
  const params = {
    TableName: dynamodbTableName,
    Item: requestBody
  }
  return await dynamodb.put(params).promise().then(() => {
    const body = {
      Operation: 'SAVE',
      Message: 'SUCCESS',
      Item: requestBody
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('Error al guardar el animal: ', error);
  })
}

//Function to modify the animal
async function modifyProduct(id, updateKey, updateValue) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'id': id
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ':value': updateValue
    },
    ReturnValues: 'UPDATED_NEW'
  }
  return await dynamodb.update(params).promise().then((response) => {
    const body = {
      Operation: 'UPDATE',
      Message: 'SUCCESS',
      UpdatedAttributes: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('Error al modificar el animal: ', error);
  })
}

//Function to delete the animal based in the id
async function deleteProduct(id) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'id': id
    },
    ReturnValues: 'ALL_OLD'
  }
  return await dynamodb.delete(params).promise().then((response) => {
    const body = {
      Operation: 'DELETE',
      Message: 'SUCCESS',
      Item: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('Error al eliminar el animal: ', error);
  })
}

function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }
}