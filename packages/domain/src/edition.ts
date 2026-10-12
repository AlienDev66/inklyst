/** An ebook surface renders only when a license exists. Metadata alone is not a file. */
export function canRenderEdition(edition: { licensee: string | null }): boolean {
  return Boolean(edition.licensee && edition.licensee.trim().length > 0);
}
