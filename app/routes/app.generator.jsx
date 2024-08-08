import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import React, { useEffect, useState } from "react";
import {
  EmptyState,
  IndexTable,
  Layout,
  Page,
  Spinner,
  useIndexResourceState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { Modal, TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { HumanMessage } from "@langchain/core/messages";
import TableRowComponent from "../components/table_row/table_row";
import {
  getImageBase64Encoded,
  initializeGenerativeAIInstance,
} from "../functions/util";
export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const productsCountResponse = await admin.graphql(
    `#graphql
  query {
productsCount{
  count
}
}`,
  );

  const productsCount = await productsCountResponse.json();
  const response = await admin.graphql(
    `#graphql
  query {
    products(first: 10) {
    edges {
        node {
      title
      id
      description   
      onlineStoreUrl
      featuredImage {
        url
      }
  }
  }
    }
  }`,
  );

  const data = await response.json();
  data.data.count = productsCount.data.productsCount.count;
  data.data.message = "ok";
  return json(data);
}

export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const product = new admin.rest.resources.Product({ session: session });
  const formData = await request.formData();
  const type = formData.get("type");
  if (type == "title") {
    product.id = formData.get("id");
    product.title = formData.get("title");
  } else if (type == "description") {
    product.id = formData.get("id");
    product.body_html = formData.get("description");
  }

  await product.save({
    update: true,
  });
  return json({
    message: "ok",
    title: `${formData.get("title")}`,
    description: `${product.description}`,
    id: formData.get("id"),
  });
}
export default function GeneratorComponent() {
  const user = useLoaderData();
  const [updateInProgress, setUpdateInProgress] = useState(false);
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const productId = fetcher.data?.message.replace("ok", "");

  useEffect(() => {
    if (productId == "") {
      shopify.toast.show("Product updated");
      setUpdateInProgress(false);
    }
  }, [productId, shopify]);
  const products = user.data.products!=null || user.data.products.length>0 ?user.data.products.edges.map((val) => {
    return {
      id: val.node.id,
      title: val.node.title,
      description: val.node.description,
      imageUrl:
        val.node.featuredImage == null ? null : val.node.featuredImage.url,
    };
  }):[];
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products);

  const rowMarkup = products.map(
    ({ id, title, imageUrl, description }, index) => (
      <TableRowComponent
        id={id}
        description={description}
        imageUrl={imageUrl}
        title={title}
        selectedResources={selectedResources}
        index={index}
        key={index}
      ></TableRowComponent>
    ),
  );

  async function updateProductTitle(type) {
    const product = products.filter(
      (product) => product.id == selectedResources[0],
    )[0];
    const base64EncodedString = await getImageBase64Encoded(product.imageUrl);
    const vision = initializeGenerativeAIInstance("google");
    const title_input = [
      new HumanMessage({
        content: [
          {
            type: "text",
            text: "Write a short title for the following image.",
          },
          {
            type: "image_url",
            image_url: `data:image/png;base64,${base64EncodedString}`,
          },
        ],
      }),
    ];
    const description_input = [
      new HumanMessage({
        content: [
          {
            type: "text",
            text: "Write a short description for the following image.",
          },
          {
            type: "image_url",
            image_url: `data:image/png;base64,${base64EncodedString}`,
          },
        ],
      }),
    ];
    if (type == "title") {
      const response = await vision.invoke(title_input);
      fetcher.submit(
        {
          id: selectedResources[0].substring(
            selectedResources[0].lastIndexOf("/") + 1,
          ),
          title: response.content,
          type: type,
        },
        { method: "POST" },
      );
    } else if (type == "description") {
      const response = await vision.invoke(description_input);
      fetcher.submit(
        {
          id: selectedResources[0].substring(
            selectedResources[0].lastIndexOf("/") + 1,
          ),
          description: response.content,
          type: type,
        },
        { method: "POST" },
      );
    }
  }
  const promotedBulkActions = [
    {
      content: "Generate description",
      onAction: () => {
        if(selectedResources.length>1){
          shopify.toast.show("Only one product can be selected")
        }else{
          shopify.modal.show("description-modal");
        }
      },
    },
    {
      content: "Generate title",
      onAction: () => {
        if(selectedResources.length>1){
          shopify.toast.show("Only one product can be selected")
        }else{
          shopify.modal.show("title-modal");
        }
      },
    },
  ];
  useEffect(() => {
    if (updateInProgress) {
      shopify.modal.hide("title-modal");
      shopify.modal.hide("description-modal");
      shopify.modal.show("loader-modal");
    } else {
      shopify.modal.hide("loader-modal");
    }
  }, [updateInProgress, shopify]);

  return (
    <Page fullWidth>
      <TitleBar title="Update Products">
        
        </TitleBar>
        <Modal id="loader-modal">
        <Spinner accessibilityLabel="Spinner example" size="large" />
        <TitleBar title="Loading"></TitleBar>
      </Modal>
      

<Modal id="title-modal">
      <p style={{ padding: "10px" }}>Are you sure you want to generate the title?</p>

      <TitleBar title="Confirmation Message">
        <button onClick={() => {
          shopify.modal.hide("title-modal").then((val) => {
            shopify.toast.show("Thanks", {
              duration: 5000,
            });
          });
        }}>No</button>
        <button onClick={() =>{
          setUpdateInProgress(true);
          updateProductTitle("title");
        }} variant="primary">
          Yes
        </button>
      </TitleBar>
    </Modal>

<Modal id="description-modal">
      <p style={{ padding: "10px" }}>Are you sure you want to generate the description?</p>

      <TitleBar title="Confirmation Message">
        <button onClick={() => {
          shopify.modal.hide("description-modal").then((val) => {
            shopify.toast.show("Thanks", {
              duration: 5000,
            });
          });
        }}>No</button>
        <button onClick={() => {
          setUpdateInProgress(true);
          updateProductTitle("description");
        }} variant="primary">
          Yes
        </button>
      </TitleBar>
    </Modal>

      <Layout>
        <Layout.Section>
          {products.length==0 ? 
          <EmptyState
          heading="No Products Found"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
        </EmptyState>:
          <Form method="post">
            <IndexTable
              resourceName={{
                singular: "product",
                plural: "products",
              }}
              itemCount={products.length}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Image" },
                { title: "Title" },
                { title: "Description" },
              ]}
              promotedBulkActions={promotedBulkActions}
              pagination={{
                hasNext: true,
                onNext: () => {},
              }}
            >
              {rowMarkup}
            </IndexTable>
          </Form>
}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
