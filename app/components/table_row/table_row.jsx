import { IndexTable, Thumbnail } from "@shopify/polaris";

export default function TableRowComponent({ id, title, imageUrl, description, index,selectedResources}){
    let disabled=imageUrl==null? true:false;
    return (
        <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
        disabled={disabled}
      >

        <IndexTable.Cell>
          <Thumbnail source={imageUrl} alt="Black choker necklace" />
        </IndexTable.Cell>
        <IndexTable.Cell>
        <p style={{textWrap:"wrap"}}>{title}</p>
          
        </IndexTable.Cell>
        <IndexTable.Cell>
          <p style={{textWrap:"wrap"}}>{description}</p>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
}