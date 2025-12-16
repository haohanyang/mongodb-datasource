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

export function unixTsToMongoID(utc_ms: number, rightPadding: string) {
  const val = Math.trunc(utc_ms / 1000);

  if (val < 0 || val > 0xffffffff) {
    return '';
  }

  let hexString = val.toString(16);

  while (hexString.length < 8) {
    hexString = '0' + hexString;
  }

  while (hexString.length < 24) {
    hexString = hexString + rightPadding;
  }

  return hexString;
}
