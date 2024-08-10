import { useEffect } from "react";
import { json } from "@remix-run/node";

import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  
  BlockStack,
  Button,
  CalloutCard,
  Divider,
  Grid,
  Box,
  ExceptionList,
  InlineGrid
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { ANNUAL_PLAN, authenticate, MONTHLY_PLAN } from "../shopify.server";

export async function loader({ request }) {
  const { billing } = await authenticate.admin(request);

  try {
    // Attempt to check if the shop has an active payment for any plan
    const billingCheck = await billing.require({
      plans: [MONTHLY_PLAN, ANNUAL_PLAN],
      isTest: true,
      // Instead of redirecting on failure, just catch the error
      onFailure: () => {
        throw new Error('No active plan');
      },
    });

    // If the shop has an active subscription, log and return the details
    const subscription = billingCheck.appSubscriptions[0];
    console.log(`Shop is on ${subscription.name} (id ${subscription.id})`);
    return json({ billing, plan: subscription });

  } catch (error) {
    // If the shop does not have an active plan, return an empty plan object
    if (error.message === 'No active plan') {
      console.log('Shop does not have any active plans.');
      return json({ billing, plan: { name: "Free" } });
    }
    // If there is another error, rethrow it
    throw error;
  }
}


export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        input: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();
  const variantId =
    responseJson.data.productCreate.product.variants.edges[0].node.id;
  const variantResponse = await admin.graphql(
    `#graphql
      mutation shopifyRemixTemplateUpdateVariant($input: ProductVariantInput!) {
        productVariantUpdate(input: $input) {
          productVariant {
            id
            price
            barcode
            createdAt
          }
        }
      }`,
    {
      variables: {
        input: {
          id: variantId,
          price: Math.random() * 100,
        },
      },
    },
  );
  const variantResponseJson = await variantResponse.json();

  return json({
    product: responseJson.data.productCreate.product,
    variant: variantResponseJson.data.productVariantUpdate.productVariant,
  });
};

let planData = [
  {
    title: "Free",
    description: "Free plan with basic features",
    price: "0",
    action: "Upgrade to pro",
    name: "Free",
    url: "/app/upgrade",
    features: [
      "1 Product Title Update at a time",
"1 Product Description Update at a time",
"Automatic Update Of Product Title/Description"
 
    ]
  },
  {
    title: "Pro",
    description: "Pro plan with advanced features",
    price: "5",
    name: "Pro",
    action: "Upgrade to pro",
    url: "/app/upgrade",
    features: [
      "5 Product Title Update at a time",
"5 Product Description Update at a time",
"Automatic Update Of Product Title/Description"
    ]
  },
]

export default function Index() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";
  const productId = fetcher.data?.product?.id.replace(
    "gid://shopify/Product/",
    "",
  );

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId, shopify]);
  const generateProduct = () => fetcher.submit({}, { method: "POST" });
  const { plan } = useLoaderData();
  console.log("plan",plan.name);
  return (
    <Page>
      <ui-title-bar title="Pricing" />
      {plan.name=="Free" ?
      <Card roundedAbove="sm">
      <BlockStack gap="200">
        <InlineGrid columns="1fr auto">
          <Text as="h2" variant="headingSm">
            Free
          </Text>
          
        </InlineGrid>
        <Text as="p" variant="bodyMd">
        You're currently on free plan. Upgrade to pro to unlock more features.
        </Text>
      </BlockStack>
    </Card>:
      <CalloutCard
          title="Change your plan"
          illustration="https://cdn.shopify.com/s/files/1/0583/6465/7734/files/tag.png?v=1705280535"
          primaryAction={{
            content: 'Cancel Plan',
            url: '/app/cancel',
          }}
        >
          { plan.name == "Monthly subscription" ? (
            <p>
              You're currently on pro plan. All features are unlocked.
            </p>
          ) : (
            <p>
              You're currently on free plan. Upgrade to pro to unlock more features.
            </p>
          )}
      </CalloutCard>
}
      <div style={{ margin: "0.5rem 0"}}>
        <Divider />
      </div>

      <Grid>

        {planData.map((plan_item, index) => (
          <Grid.Cell key={index} columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
            <Card background={ plan_item.name == plan.name ? "bg-surface-success" : "bg-surface" } sectioned>
              <Box padding="400">
                <Text as="h3" variant="headingMd">
                  {plan_item.title}
                </Text>
                <Box as="p" variant="bodyMd">
                  {plan_item.description}
                  {/* If plan_item is 0, display nothing */}
                  <br />
                  <Text as="p" variant="headingLg" fontWeight="bold">
                    {plan_item.price === "0" ? "" : "$" + plan_item.price}
                  </Text>
                </Box>

                <div style={{ margin: "0.5rem 0"}}>
                  <Divider />
                </div>

                <BlockStack gap={100}>
                  {plan_item.features.map((feature, index) => (
                    <ExceptionList
                      key={index}
                      items={[
                        {
                          description: feature,
                        },
                      ]}
                    />
                  ))}
                </BlockStack>
                <div style={{ margin: "0.5rem 0"}}>
                  <Divider />
                </div>

                { plan_item.name == "Pro" ?
                  plan.name != "Pro" ? (
                    <Button primary url={plan_item.url}>
                      {plan_item.action}
                    </Button>
                  ) : (
                    <Text as="p" variant="bodyMd">
                      You're currently on this plan
                    </Text>
                  )
                : null }
              </Box>
            </Card>
          </Grid.Cell>
        ))}

      </Grid>

    </Page>
  );
  return (
    <Page>
      <TitleBar title="What can you get via this app?">
        
      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Congrats on installing content generation app 🎉
                  </Text>
                  <Button url="/app/upgrade">Upgrade</Button>
                  
                </BlockStack>
                
              </BlockStack>
            </Card>
          </Layout.Section>
          
        </Layout>
      </BlockStack>
    </Page>
  );
}
