import React, { useRef, useState } from 'react';
import { PrimaryButton, Spinner, Stack } from '@fluentui/react';
import { ExceptionLayout } from '../ExceptionLayout';
import { APIError } from '../../../models/exceptions';
import { useAuthStorageCall } from '../../../hooks/useAuthStorageCall';
import { StorageResourceType } from '../../../models/storage';
import { HttpMethod } from '../../../hooks/useAuthApiCall';

interface AirlockFileUploadProps {
    storageAccount: string;
    title: string;
    containerName: string;
    onUploadComplete?: (success: boolean) => void;
}

export const AirlockFileUpload: React.FunctionComponent<AirlockFileUploadProps> = (props: AirlockFileUploadProps) => {

    const [airlockFilesUploading, setAirlockFilesUploading] = useState(false);

    const [hasAirlockUploadError, setHasAirlockUploadError] = useState(false);
    const [airlockUploadError, setAirlockUploadError] = useState({} as APIError);
    const inputFile = useRef<HTMLInputElement>(null);

    const storageCall = useAuthStorageCall();


    const handleFileUpload = () => {
        if (inputFile && inputFile.current) {
            inputFile.current.click();
        }
    }

    const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setAirlockFilesUploading(true)
            const file = event.target.files?.item(0);
            const fileName = file?.name;
            if (file) {
                const put_blob_endpoint = `${props.containerName}/${fileName}`;

                const headers: [string, string][] = []
                headers.push(['x-ms-blob-type', 'BlockBlob'])

                const response = await storageCall(props.storageAccount,
                    HttpMethod.Put,
                    put_blob_endpoint,
                    headers, file,
                    StorageResourceType.Blob);

                if (!response) {
                    throw new Error("No response from storage call");
                }
                if (!response.ok) {
                    let e = new APIError();
                    e.message = await response.text();
                    e.status = response.status;
                    e.endpoint = put_blob_endpoint;
                    throw e;
                }

                if (props.onUploadComplete) {
                    props.onUploadComplete(true);
                }

            }
        } catch (err: any) {
            err.userMessage = 'Error retrieving files';
            setAirlockUploadError(err);
            setHasAirlockUploadError(true);
            if (props.onUploadComplete) {
                props.onUploadComplete(false);
            }
        }
        if (inputFile && inputFile.current) {
            inputFile.current.value = '';
        }
        setAirlockFilesUploading(false)
    }

    return (
        <Stack.Item style={{ paddingLeft: '10px', paddingRight: '10px' }}>
            <input
                type="file"
                id="file"
                ref={inputFile}
                style={{ display: "none" }}
                onChange={(event) => handleFileSelected(event)}
            />
            <PrimaryButton text={props.title} onClick={() => handleFileUpload()} style={{ width: '100%' }} disabled={airlockFilesUploading}>
                {
                    airlockFilesUploading && <Stack>
                        <Stack.Item>
                            <Spinner />
                        </Stack.Item>

                    </Stack>
                }
            </PrimaryButton>
            {
                hasAirlockUploadError && <ExceptionLayout e={airlockUploadError} />
            }
        </Stack.Item>
    );
};

