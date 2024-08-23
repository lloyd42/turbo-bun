function getExpTimestamp(seconds: number) {
  const currentTimeMillisecond = Date.now();
  const secondsIntoMillisecond = seconds * 1000;
  const expirationTimeMillisecond =
    currentTimeMillisecond + secondsIntoMillisecond;

  return Math.floor(expirationTimeMillisecond / 1000);
}

export { getExpTimestamp };
