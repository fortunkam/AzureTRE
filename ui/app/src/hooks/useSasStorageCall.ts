import { useCallback } from "react";
import { APIError } from "../models/exceptions";
import { HttpMethod } from "./useAuthApiCall";



export const useSasStorageCall = () => {

    return useCallback(async (
        sasUrl: string,
        method: HttpMethod,
        headers: [string, string][] = [],
        body?: any
    ) => {

        const headerSet: [string, string][] = []
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

        let resp;
        try {
            resp = await fetch(`${sasUrl}`, opts);
        } catch (err: any) {
            let e = err as APIError;
            e.name = 'API call failure';
            e.message = 'Unable to make call to API Backend';
            e.endpoint = `${sasUrl}`;
            throw e;
        }

        if (!resp.ok) {
            let e = new APIError();
            e.message = await resp.text();
            e.status = resp.status;
            e.endpoint = sasUrl;
            throw e;
        }

        return resp;

    }, []);
}
