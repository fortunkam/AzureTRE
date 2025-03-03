import {
  MessageBar,
  MessageBarType,
  Pivot,
  PivotItem,
  PrimaryButton,
  Stack,
  TextField,
  TooltipHost,
  DefaultButton,
  Spinner,
} from "@fluentui/react";
import React, { useCallback, useEffect, useState } from "react";
import { HttpMethod, useAuthApiCall } from "../../../hooks/useAuthApiCall";
import { AirlockRequest, AirlockRequestStatus } from "../../../models/airlock";
import { ApiEndpoint } from "../../../models/apiEndpoints";
import { APIError } from "../../../models/exceptions";
import { ExceptionLayout } from "../ExceptionLayout";
import { CliCommand } from "../CliCommand";
import { useSasStorageCall } from "../../../hooks/useSasStorageCall";
import { AirlockFileUpload } from "./AirlockFileUpload";
import { parseSasUrl } from "../../../hooks/parseSasUrl";

interface AirlockRequestFilesSectionProps {
  request: AirlockRequest;
  workspaceApplicationIdURI: string;
}

export const AirlockRequestFilesSection: React.FunctionComponent<
  AirlockRequestFilesSectionProps
> = (props: AirlockRequestFilesSectionProps) => {
  const COPY_TOOL_TIP_DEFAULT_MESSAGE = "Copy to clipboard";

  const [copyToolTipMessage, setCopyToolTipMessage] = useState<string>(
    COPY_TOOL_TIP_DEFAULT_MESSAGE,
  );
  const [sasUrl, setSasUrl] = useState<string>();

  const [sasUrlError, setSasUrlError] = useState(false);
  const [apiSasUrlError, setApiSasUrlError] = useState({} as APIError);

  const [airlockFiles, setAirlockFiles] = useState<string[]>([]);
  const [airlockFilesLoading, setAirlockFilesLoading] = useState(true);

  const [hasAirlockUploadError, setHasAirlockUploadError] = useState(false);
  const [airlockUploadError, setAirlockUploadError] = useState({} as APIError);

  const [airlockFileDownloading, setAirlockFileDownloading] = useState(false);

  const apiCall = useAuthApiCall();
  const storageCall = useSasStorageCall();

  const generateSasUrl = useCallback(async () => {
    if (props.request && props.request.workspaceId) {
      try {
        const linkObject = await apiCall(
          `${ApiEndpoint.Workspaces}/${props.request.workspaceId}/${ApiEndpoint.AirlockRequests}/${props.request.id}/${ApiEndpoint.AirlockLink}`,
          HttpMethod.Get,
          props.workspaceApplicationIdURI,
        );
        setSasUrl(linkObject.containerUrl);
      } catch (err: any) {
        err.userMessage = "Error retrieving storage link";
        setApiSasUrlError(err);
        setSasUrlError(true);
      }
    }
  }, [apiCall, props.request, props.workspaceApplicationIdURI]);


  const handleCopySasUrl = () => {
    if (!sasUrl) {
      return;
    }
    navigator.clipboard.writeText(sasUrl);
    setCopyToolTipMessage("Copied");
    setTimeout(
      () => setCopyToolTipMessage(COPY_TOOL_TIP_DEFAULT_MESSAGE),
      3000,
    );
  };

  const getAzureCliCommand = (sasUrl: string) => {
    let containerDetails = parseSasUrl(sasUrl);
    if (!containerDetails) {
      return "";
    }

    let cliCommand = "";
    if (props.request.status === AirlockRequestStatus.Draft) {
      cliCommand = `az storage blob upload --file </path/to/file> --name <filename.filetype> --account-name ${containerDetails.StorageAccountName} --type block --container-name ${containerDetails.containerName} --sas-token "${containerDetails.sasToken}"`;
    } else {
      cliCommand = `az storage blob download-batch --destination </destination/path/for/file> --source ${containerDetails.containerName} --account-name ${containerDetails.StorageAccountName} --sas-token "${containerDetails.sasToken}"`;
    }

    return cliCommand;
  };

  const handleUploadComplete = (success: boolean) => {
    if (success) {
      getAirlockFiles();
    }
  }

  const getAirlockFiles = useCallback(async () => {
    if (props.request && props.request.workspaceId) {
      try {
        setAirlockFilesLoading(true);
        const files = await storageCall(`${sasUrl}&comp=list&restype=container`, HttpMethod.Get);
        let filesXml = await files?.text() ?? '';
        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(filesXml, "text/xml");
        let blobs = xmlDoc.getElementsByTagName("Blob");
        let filesArray: string[] = [];
        for (let i = 0; i < blobs.length; i++) {
          filesArray.push(blobs[i].getElementsByTagName("Name")[0].textContent as string);
        }

        setAirlockFiles(filesArray);

      } catch (err: any) {
        err.userMessage = 'Error retrieving files';
        setAirlockUploadError(err);
        setHasAirlockUploadError(true);
      }
      setAirlockFilesLoading(false)
    }
  }, [storageCall, props.request, sasUrl]);

  const handleDeleteFile = async (fileName: string) => {
    if (!fileName) {
      return;
    }

    if (props.request && props.request.workspaceId) {
      try {
        setAirlockFilesLoading(true)
        await storageCall(`${sasUrl}`, HttpMethod.Delete);

        await getAirlockFiles();
      } catch (err: any) {
        err.userMessage = 'Error retrieving files';
        setAirlockUploadError(err);
        setHasAirlockUploadError(true);
      }
      setAirlockFilesLoading(false)
    }
  }

  const handleDownloadFile = async (fileName: string) => {
    if (!fileName) {
      return;
    }

    if (props.request && props.request.workspaceId) {
      try {
        setAirlockFileDownloading(true);

        const sasDetails = parseSasUrl(`${sasUrl}`);
        const deleteUrl = `https://${sasDetails?.StorageAccountName}.blob.core.windows.net/${sasDetails?.containerName}/${fileName}?${sasDetails?.sasToken}`;

        const response = await storageCall(`${deleteUrl}`, HttpMethod.Get);
        if (!response || !response.ok) {
          throw new Error("No response from storage call");
        }

        const file = await response.blob();

        const url = window.URL.createObjectURL(file);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        // the filename you want
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

      } catch (err: any) {
        err.userMessage = 'Error downloading file';
      }
      setAirlockFileDownloading(false);

    }
  }

  useEffect(() => {
    const fetchData = async () => {
      await getAirlockFiles();
    }
    fetchData();
  }, [getAirlockFiles]);

  useEffect(() => {
    generateSasUrl();
  }, [generateSasUrl]);

  return (
    <Stack>
      <Pivot aria-label="Storage options">
        <PivotItem headerText="SAS URL">
          <Stack>
            <Stack.Item style={{ paddingTop: "10px", paddingBottom: "10px" }}>
              {props.request.status === AirlockRequestStatus.Draft ? (
                <small>
                  Use the storage container SAS URL to upload your request file.
                </small>
              ) : (
                <small>
                  Use the storage container SAS URL to view the request file.
                </small>
              )}
              <Stack
                horizontal
                styles={{ root: { alignItems: "center", paddingTop: "7px" } }}
              >
                <Stack.Item grow>
                  <TextField readOnly value={sasUrl} />
                </Stack.Item>
                <TooltipHost content={copyToolTipMessage}>
                  <PrimaryButton
                    iconProps={{ iconName: "copy" }}
                    styles={{ root: { minWidth: "40px" } }}
                    onClick={() => {
                      handleCopySasUrl();
                    }}
                  />
                </TooltipHost>
              </Stack>
            </Stack.Item>
            {props.request.status === AirlockRequestStatus.Draft && (
              <MessageBar messageBarType={MessageBarType.info}>
                Please upload a single file. Only single-file imports (including
                zip files) are supported.
              </MessageBar>
            )}
          </Stack>
        </PivotItem>
        <PivotItem headerText="CLI">
          <Stack>
            <Stack.Item style={{ paddingTop: "10px", paddingBottom: "10px" }}>
              <small>
                Use Azure command-line interface (Azure CLI) to interact with
                the storage container.
              </small>
              <hr
                style={{ border: "1px solid #faf9f8", borderRadius: "1px" }}
              />
            </Stack.Item>
            <Stack.Item style={{ paddingTop: "10px" }}>
              <CliCommand
                command={sasUrl ? getAzureCliCommand(sasUrl) : ""}
                title={
                  props.request.status === AirlockRequestStatus.Draft
                    ? "Upload a file to the storage container"
                    : "Download the file from the storage container"
                }
                isLoading={!sasUrl && !sasUrlError}
              />
            </Stack.Item>
          </Stack>
        </PivotItem>
        <PivotItem headerText="Direct Upload">
          <Stack>
            {
              !airlockFilesLoading &&
              <Stack.Item style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                {
                  airlockFiles.length === 0 ?
                    <small>There is currently no file attached to this request.</small> :
                    <small>The following file is attached to this airlock request.</small>
                }
              </Stack.Item>
            }
            {
              !airlockFilesLoading && airlockFiles.map(fileName =>
                <Stack.Item style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                  <Stack horizontal styles={{ root: { alignItems: 'center', paddingTop: '7px' } }}>
                    <Stack.Item grow>
                      <TextField readOnly value={fileName} />
                    </Stack.Item>
                    {
                      props.request.status === AirlockRequestStatus.Draft &&
                      <DefaultButton
                        iconProps={{ iconName: 'delete' }}
                        styles={{ root: { minWidth: '40px', backgroundColor: 'rgb(232, 17, 35)', color: 'white' } }}
                        onClick={() => { handleDeleteFile(fileName) }}
                      />
                    }
                    {
                      (props.request.status === AirlockRequestStatus.Approved) &&
                      <PrimaryButton
                        iconProps={{ iconName: 'download' }}
                        styles={{ root: { minWidth: '40px' } }}
                        onClick={() => { handleDownloadFile(fileName) }}
                        disabled={airlockFileDownloading}
                      >
                        {airlockFileDownloading && <Spinner />}
                      </PrimaryButton>
                    }

                  </Stack>
                </Stack.Item>
              )}
          </Stack>
          {!airlockFilesLoading && <Stack>
            {
              props.request.status === AirlockRequestStatus.Draft && airlockFiles.length === 0 &&
              <AirlockFileUpload title="Upload a file"
                sasUrl={sasUrl}
                containerName={props.request.id}
                onUploadComplete={handleUploadComplete} />
            }

          </Stack>
          }
          {
            airlockFilesLoading && <Stack>
              <Stack.Item style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                <Spinner />
              </Stack.Item>
            </Stack>
          }
        </PivotItem>
      </Pivot>
      {sasUrlError && <ExceptionLayout e={apiSasUrlError} />}
    </Stack>
  );
};
