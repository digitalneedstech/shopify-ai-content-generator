import { useEffect } from "react";
import { json } from "@remix-run/node";

import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Text,
  Card,
  
  BlockStack,
  Button,
  Divider,
  Grid,
  Box,
  ExceptionList,
  List
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { ANNUAL_PLAN, authenticate, MONTHLY_PLAN } from "../shopify.server";

export async function loader({ request }) {
  const { billing } = await authenticate.admin(request);

  try {
    // Attempt to check if the shop has an active payment for any plan
    const billingCheck = await billing.require({
      plans: [MONTHLY_PLAN, ANNUAL_PLAN],
      isTest: false,
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
    action: "Upgrade to Pro",
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
      
      <ui-title-bar title="Contentify - AI Content Creator">
      <Button primary url="/app/upgrade">
                      Upgrade to Pro
                    </Button>
        </ui-title-bar>
      

      <Card roundedAbove="sm">
      <Text variant="headingLg" as="h6">
        Generate content with our easy flow
      </Text>
      <br/>
      <List type="bullet">
      <List.Item><Text as="h2" variant="headingSm">
            Navigate to Text Generator page of this app from sidebar 
          </Text></List.Item>
      <List.Item><Text as="h2" variant="headingSm">
            Select the products to update:
          </Text></List.Item>
      <List.Item><Text as="h2" variant="headingSm">
            Select whether you want to generate titles, descriptions
          </Text></List.Item>
      <List.Item><Text as="h2" variant="headingSm">
            Click On Generate 
          </Text></List.Item>
    </List>

      </Card>
<div style={{ margin: "0.5rem 0"}}>
        <Divider />
      </div>
      <Card roundedAbove="sm">
        <Text variant="headingLg" as="h6">
        Have Questions?
      </Text>
      <br/>
      <Text as="p" fontWeight="regular">
      Got questions or need a hand with anything related to your entrepreneurial journey? We're here to help.
      </Text>
      <Text as="p" fontWeight="regular">
Reach out anytime—We would love to assist and learn from your journey!.
</Text>
<br></br>
<Text as="p" fontWeight="regular">
We're available at</Text> <Text as="p" fontWeight="bold">digitalneeds.tech@gmail.com
      </Text>
      </Card>

      <div style={{ margin: "0.5rem 0"}}>
        <Divider />
      </div>


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
}
