export function canReadMargin(input: {
  readerPage: number;
  anchorPage: number;
  isAuthor: boolean;
}): boolean {
  if (input.isAuthor) return true;
  return input.readerPage >= input.anchorPage;
}
