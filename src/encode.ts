export function base64UrlEncode(input: string | undefined) {
    if (!input) {
        return '';
    }
    // Encode input string to Base64
    let base64 = btoa(input);
    // Make the Base64 string URL-safe
    let base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return base64Url;
}