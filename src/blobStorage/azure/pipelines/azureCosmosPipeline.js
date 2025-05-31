import { CosmosClient } from "@azure/cosmos";
import "dotenv/config";
import { logger } from "../../../loggers/logger.js";

// Set these up based on your Azure Cosmos DB instance
const COSMOS_DB_ENDPOINT = process.env.COSMOS_DB_ENDPOINT;
const COSMOS_DB_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DB_NAME = process.env.COSMOS_DB_NAME;
const COSMOS_CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const enrichReviewWithPartitionKey = (review) => {
  if (!review || !review.reviewSiteSlug || !review.authorExternalId) {
    logger("Invalid review object", "error");
    return null;
  }
  const partitionKey = `${review.reviewSiteSlug}#${review.authorExternalId}`;
  return {
    ...review,
    partitionKey,
  };
};

export async function runSaveToLogicAppPipeline(uploadResult, reviewsList) {
  if (!uploadResult || !uploadResult.success) {
    logger("Skipping Cosmos DB save nothing new.", "warn");
    return { success: false, message: "Upload to Blob failed." };
  }

  try {
    // Ensure the container exists (or create it)
    const container = await getOrCreateCosmosContainer({
      endpoint: COSMOS_DB_ENDPOINT,
      key: COSMOS_DB_KEY,
      databaseId: COSMOS_DB_NAME,
      containerId: COSMOS_CONTAINER_NAME,
      partitionKeyPath: "/partitionKey",
    });

    logger(`Saving ${reviewsList.length} reviews to Cosmos DB...`, "info");

    const insertResults = [];
    for (const review of reviewsList) {
      try {
        const enrichedReview = enrichReviewWithPartitionKey(review);
        if (!enrichedReview) {
          continue; // Skip invalid reviews
        }

        const { resource: createdItem } = await container.items.create(
          enrichedReview
        );
        insertResults.push(createdItem);
        logger(
          `Inserted review with id: ${createdItem.id || "[no id]"}`,
          "info"
        );

        await delay(500);
      } catch (itemError) {
        logger(`Failed to insert review: ${itemError.message}`, "error");
      }
    }

    return {
      success: true,
      insertedCount: insertResults.length,
      attempted: reviewsList.length,
    };
  } catch (err) {
    logger(
      `Could not save to CosmosDB - total throughput to 1400 reached`,
      "warn"
    );
    return {
      success: false,
      error: err.message,
    };
  }
}

async function getOrCreateCosmosContainer({
  endpoint,
  key,
  databaseId,
  containerId,
  partitionKeyPath = "/partitionKey",
  throughput = 400,
}) {
  const client = new CosmosClient({ endpoint, key });

  const { database } = await client.databases.createIfNotExists({
    id: databaseId,
  });

  const { container } = await database.containers.createIfNotExists(
    {
      id: containerId,
      partitionKey: {
        paths: [partitionKeyPath],
        kind: "Hash",
      },
    },
    { offerThroughput: throughput }
  );

  return container;
}
