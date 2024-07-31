import { useCallback, useEffect, useState } from "react";
import {
  reactExtension,
  useApi,
  TextField,
  AdminAction,
  Button,
  TextArea,
  BlockStack,
  Text,
  ProgressIndicator,
  InlineStack,
  Banner,
} from "@shopify/ui-extensions-react/admin";
import { getIssues, updateIssues,getProduct } from "./utils";
import { Thumbnail } from "@shopify/polaris";
import { getImageBase64Encoded, initializeGenerativeAIInstance } from "../../../app/functions/util";
import { HumanMessage } from "@langchain/core/messages";
import { useAppBridge } from "@shopify/app-bridge-react";

function generateId (allIssues) {
  return !allIssues?.length ? 0 : allIssues[allIssues.length - 1].id + 1;
};

function validateForm ({title, description}) {
  return {
    isValid: Boolean(title) && Boolean(description),
    errors: {
      title: !title,
      description: !description,
    },
  };
};

// The target used here must match the target used in the extension's .toml file at ./shopify.ui.extension.toml
const TARGET = "admin.product-details.action.render";

export default reactExtension(TARGET, () => <App />);

function App() {
  const { close, data, intents } = useApi(TARGET);
  const issueId = intents?.launchUrl
    ? new URL(intents?.launchUrl)?.searchParams?.get("issueId")
    : null;
    const shopify = useAppBridge();
    const [showToast, setShowToast] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(issueId ? true : false);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [issue, setIssue] = useState({ title: "", description: "",image:"" });
  const [allIssues, setAllIssues] = useState([]);
  const [formErrors, setFormErrors] = useState(null);
  const [isEditing, setIsEditing] = useState(false);


  useEffect(() => {
    getIssues(data.selected[0].id).then((issues) => {
      setLoadingInfo(false);
      setAllIssues(issues || []);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const getIssueRecommendation = useCallback(async () => {
    // Get a recommended issue title and description from your app's backend
    setLoadingRecommended(true);
    // fetch is automatically authenticated and the path is resolved against your app's URL
    let product=await getProduct(data.selected[0].id);
    if(product.product.featuredImage==null || product.product.featuredImage.url==null){
      setShowToast(true);
    }else{
    let image=product.product.featuredImage.url;
    const vision = initializeGenerativeAIInstance("google");
    const base64EncodedString =await getImageBase64Encoded(image);
    const title_input = [
      new HumanMessage({
        content: [
          {
            type: "text",
            text: "Write a short and crisp title for the image provided in less than 30 words. The title should be great for seo as well.",
          },
          {
            type: "image_url",
            image_url: `data:image/png;base64,${base64EncodedString}`,
          },
        ],
      }),
    ];
    const response = await vision.invoke(title_input);

    const description_input = [
      new HumanMessage({
        content: [
          {
            type: "text",
            text: "Write a short and crisp description for the image provided in less than 100 words. The title should be great for seo as well.",
          },
          {
            type: "image_url",
            image_url: `data:image/png;base64,${base64EncodedString}`,
          },
        ],
      }),
    ];
    const description_response = await vision.invoke(description_input);
    setIssue({
      ...issue,
      title:response.content,
      description:description_response.content,
      image:image
    });
  }
  
    setLoadingRecommended(false);
  
  }, [data.selected]);

  const onSubmit = useCallback(async () => {
    const {isValid, errors} = validateForm(issue);
    setFormErrors(errors);

    if (isValid) {
      const newIssues = [...allIssues];
      if (isEditing) {
        // Find the index of the issue that you're editing
        const editingIssueIndex = newIssues.findIndex(
          (listIssue) => listIssue.id == issue.id,
        );
        // Overwrite that issue's title and description with the new ones
        newIssues[editingIssueIndex] = {
          ...issue,
          title: issue.title,
          description: issue.description
        };
      } else {
        // Add a new issue at the end of the list
        newIssues.push({
          id: generateId(allIssues),
          title: issue.title,
          description: issue.description,
          completed: false,
        });
      }

      // Commit changes to the database
      await updateIssues(data.selected[0].id, newIssues);
      // Close the modal
      close();
    }
  }, [allIssues, close, data.selected, isEditing, issue]);

  useEffect(() => {
    if (issueId) {
      // If opened from the block extension, then find the issue that's being edited
      const editingIssue = allIssues.find(({ id }) => `${id}` === issueId);
      if (editingIssue) {
        // Set the issue's ID in the state
        setIssue(editingIssue);
        setIsEditing(true);
      }
    } else {
      setIsEditing(false);
    }
  }, [issueId, allIssues]);

  if (loadingInfo) {
    return <></>;
  }

  return (
    <AdminAction
      title={isEditing ? "Edit" : "Create"}
      primaryAction={
        <Button onPress={onSubmit}>{isEditing ? "Save" : "Create"}</Button>
      }
      secondaryAction={<Button onPress={close}>Cancel</Button>}
    >

      {/*Create a banner to let the buyer auto fill the issue with the
      recommendation from the backend*/}
      <BlockStack gap="base">
        <Banner>
          <BlockStack gap="base">
            <Text>
             {showToast ? "This feature is available only after adding an image": "Automatically generate title and description based on product image"}
            </Text>
            <InlineStack blockAlignment="center" gap="base">
              {/*When the button is pressed, fetch the reccomendation*/}
              <Button
                onPress={getIssueRecommendation}
                disabled={loadingRecommended}
              >
                Generate Title/Description
              </Button>
              {loadingRecommended && <ProgressIndicator size="small-100" />}
            </InlineStack>
          </BlockStack>
        </Banner>

        <TextField
          value={issue.title}
          error={formErrors?.title ? "Please enter a title" : undefined}
          onChange={(val) => setIssue((prev) => ({ ...prev, title: val }))}
          label="Title"
        />

        <TextArea
          value={issue.description}
          error={
            formErrors?.description ? "Please enter a description" : undefined
          }
          onChange={(val) =>
            setIssue((prev) => ({ ...prev, description: val }))
          }
          label="Description"
        />
        
      </BlockStack>
    </AdminAction>
  );
}
