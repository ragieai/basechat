export function stripImageDisclaimers(text: string, hasImages: boolean) {
  if (!hasImages || !text) return text;
  let out = text.replace(
    /\bI (?:can(?:not|'t)|don'?t have the (?:ability|capability)) (?:to )?(?:display|show) images?[^.]*\.\s*/gi,
    "",
  );
  // Clean excessive blank lines
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return out;
}
