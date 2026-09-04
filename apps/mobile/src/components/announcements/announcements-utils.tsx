/**
 * Remove HTML tags and HTML entities from a given string.
 */
export function removeHtmlTagsAndEntities(input: string) {
  return input.replace(/<[^>]+>|&[^;]+;/g, "")
}
