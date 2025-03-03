export const parseSasUrl = (sasUrl: string) => {
    const match = sasUrl.match(
        /https:\/\/(.*?).blob.core.windows.net\/(.*)\?(.*)$/,
    );
    if (!match) {
        return;
    }

    return {
        StorageAccountName: match[1],
        containerName: match[2],
        sasToken: match[3],
    };
};