import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'

let isWarm = false

const getDynamoClient = () => {
  const region = process.env.AWS_REGION || 'us-east-1'
  const client = new DynamoDBClient({ region })
  return DynamoDBDocumentClient.from(client)
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const config = useRuntimeConfig()
  const region = process.env.AWS_REGION || 'unknown'
  const wasCold = !isWarm
  isWarm = true

  const regionNames: Record<string, string> = {
    'us-east-1': 'N. Virginia',
    'us-west-2': 'Oregon',
  }

  const now = new Date()
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  })
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  let counter = 0
  try {
    const dynamo = getDynamoClient()
    const result = await dynamo.send(new UpdateCommand({
      TableName: config.dynamodbTable,
      Key: { PK: 'GLOBAL', SK: 'COUNTER' },
      UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :inc',
      ExpressionAttributeNames: { '#count': 'count' },
      ExpressionAttributeValues: { ':zero': 0, ':inc': 1 },
      ReturnValues: 'UPDATED_NEW',
    }))
    counter = result.Attributes?.count || 0
  } catch (error) {
    console.error('Counter error:', error)
  }

  return {
    time: timeFormatter.format(now),
    date: dateFormatter.format(now),
    timezone: 'UTC',
    region,
    regionName: regionNames[region] || region,
    latency: Date.now() - startTime,
    renderMode: 'server-side',
    requestId: crypto.randomUUID(),
    coldStart: wasCold,
    counter,
    version: '1.1.0',
  }
})
