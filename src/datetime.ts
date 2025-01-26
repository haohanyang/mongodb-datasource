export function datetimeToJson(datetime: number) {
  return JSON.stringify({
    $date: {
      $numberLong: datetime.toString(),
    },
  });
}

export function unixTsToMongoID(ts: number, rightPadding: string) {
  const val = Math.trunc(ts / 1000)

  if (val < 0 || val > 0xFFFFFFFF) {
    return '';
  }

  let hexString = val.toString(16)

  while (hexString.length < 8) {
    hexString = '0' + hexString;
  }

  while (hexString.length < 24) {
    hexString = hexString + rightPadding;
  }

  return hexString;
}