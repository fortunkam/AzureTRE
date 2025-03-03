import { AuthenticationResult, InteractionRequiredAuthError } from "@azure/msal-browser";
import { useMsal, useAccount } from "@azure/msal-react";
import { useCallback } from "react";
import { APIError } from "../models/exceptions";
import config from "../config.json";
import { HttpMethod } from "./useAuthApiCall";
import { StorageResourceType } from "../models/storage";



export const useAuthStorageCall = () => {
    const { instance, accounts } = useMsal();
    const account = useAccount(accounts[0] || {});

    const storageScope = "https://storage.azure.com/user_impersonation";
    const blobOperationsVersion = "2019-12-12";


    return useCallback(async (
        storageAccountName: string,
        method: HttpMethod,
        endpoint: string,
        headers: [string, string][] = [],
        body?: any,
        storageResource: StorageResourceType = StorageResourceType.Blob
    ) => {

        config.debug && console.log("Storage call", {
            storageAccountName: storageAccountName,
            endpoint: endpoint,
            method: method,
        });

        if (!account) {
            console.error("No account object found, please refresh.");
            return;
        }

        // try and get a token silently. at times this might throw an InteractionRequiredAuthError - if so give the user a popup to click
        const tokenRequest = ({
            scopes: [storageScope],
            account: account
        });

        let tokenResponse = {} as AuthenticationResult;

        try {
            tokenResponse = await instance.acquireTokenSilent(tokenRequest);
        } catch (err) {
            console.warn("Unable to get a token silently", err);
            if (err instanceof InteractionRequiredAuthError) {
                tokenResponse = await instance.acquireTokenPopup(tokenRequest);
            }
        }

        // trim first slash if we're given one
        if (endpoint[0] === "/") endpoint = endpoint.substring(1);


        const headerSet: [string, string][] = []
        headerSet.push(['Authorization', `Bearer ${tokenResponse.accessToken}`])
        headerSet.push(['x-ms-version', blobOperationsVersion])
        headerSet.push(['x-ms-date', new Date().toUTCString()])

        headers.forEach(header => headerSet.push(header));

        // set the headers for auth + http method
        const opts: RequestInit = {
            mode: "cors",
            headers: headerSet,
            method: method
        }

        // add a body if we're given one
        if (body) {
            opts.body = body;
        }

        let url = `https://${storageAccountName}.${storageResource}.core.windows.net/${endpoint}`;

        let resp;
        try {
            resp = await fetch(`${url}`, opts);
        } catch (err: any) {
            let e = err as APIError;
            e.name = 'API call failure';
            e.message = 'Unable to make call to API Backend';
            e.endpoint = `${url}`;
            throw e;
        }

        if (!resp.ok) {
            let e = new APIError();
            e.message = await resp.text();
            e.status = resp.status;
            e.endpoint = endpoint;
            throw e;
        }

        return resp;

    }, [account, instance]);
}
