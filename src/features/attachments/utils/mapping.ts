import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';
import { useNodes } from 'src/utils/layout/NodesContext';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IData, IDataType } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

export interface SimpleAttachments {
  [attachmentComponentId: string]: IData[] | undefined;
}

function validNodeType(node: LayoutNode): node is LayoutNode<'FileUpload' | 'FileUploadWithTag'> {
  return node.item.type === 'FileUpload' || node.item.type === 'FileUploadWithTag';
}

function addAttachment(attachments: SimpleAttachments, node: LayoutNode, data: IData) {
  if (!attachments[node.item.id]) {
    attachments[node.item.id] = [];
  }
  attachments[node.item.id]?.push(data);
}

function mapAttachments(
  dataElements: IData[],
  nodes: LayoutPages,
  application: IApplicationMetadata,
  currentTask: string | undefined,
): SimpleAttachments {
  const attachments: SimpleAttachments = {};
  const dataTypeMap: { [key: string]: IDataType | undefined } = {};

  for (const dataType of application.dataTypes) {
    dataTypeMap[dataType.id] = dataType;
  }

  for (const data of dataElements) {
    const dataType = dataTypeMap[data.dataType];
    if (!dataType) {
      window.logWarnOnce(`Attachment with id ${data.id} has an unknown dataType: ${data.dataType}`);
      continue;
    }

    if (dataType.taskId && dataType.taskId !== currentTask) {
      continue;
    }

    if (dataType.appLogic?.classRef) {
      // Data models are not attachments
      continue;
    }

    if (dataType.id === 'ref-data-as-pdf') {
      // Generated PDF receipts are not attachments
      continue;
    }

    const matchingNodes = nodes.findAllById(data.dataType).filter((node) => {
      if (!validNodeType(node)) {
        window.logWarnOnce(
          `Attachment with id ${data.id} indicates it may belong to the component ${node.item.id}, which is ` +
            `not a FileUpload or FileUploadWithTag (it is a ${node.item.type})`,
        );
        return false;
      }
      return true;
    });

    // If there are multiple matching nodes, we need to find the one that has formData matching the attachment ID.
    let found = false;
    for (const node of matchingNodes) {
      const formData = node.getFormData();
      const simpleBinding = 'simpleBinding' in formData ? formData.simpleBinding : undefined;
      const listBinding = 'list' in formData ? formData.list : undefined;
      const nodeIsInRepeatingGroup = node
        .parents()
        .some((parent) => parent instanceof LayoutNodeForGroup && parent.isRepGroup());

      if (simpleBinding && simpleBinding === data.id) {
        addAttachment(attachments, node, data);
        found = true;
        break;
      }

      if (listBinding && Array.isArray(listBinding) && listBinding.some((binding) => binding === data.id)) {
        addAttachment(attachments, node, data);
        found = true;
        break;
      }

      if (
        !('simpleBinding' in formData) &&
        !('list' in formData) &&
        !nodeIsInRepeatingGroup &&
        matchingNodes.length === 1
      ) {
        // We can safely assume the attachment belongs to this node.
        addAttachment(attachments, node, data);
        found = true;
        break;
      }
    }

    !found &&
      window.logErrorOnce(
        `Could not find matching component/node for attachment ${data.dataType}/${data.id} (there may be a ` +
          `problem with the mapping of attachments to form data in a repeating group). ` +
          `Traversed ${matchingNodes.length} nodes with id ${data.dataType}`,
      );
  }

  return attachments;
}

/**
 * This hook will map all attachments in the instance data to the nodes in the layout.
 * It will however, not do anything with new attachments that are not yet uploaded as of loading the instance data.
 * Use the `useAttachments` hook for that.
 *
 * @see useAttachments
 */
export function useMappedAttachments() {
  const application = useApplicationMetadata();
  const currentTask = useLaxProcessData()?.currentTask?.elementId;
  const data = useLaxInstanceData()?.data;
  const nodes = useNodes();

  return useMemoDeepEqual(() => {
    if (data && nodes && application) {
      return mapAttachments(data, nodes, application, currentTask);
    }

    return undefined;
  }, [data, nodes, application, currentTask]);
}
