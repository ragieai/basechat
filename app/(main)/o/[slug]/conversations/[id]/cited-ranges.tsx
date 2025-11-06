import { getRagieSourcePath } from "@/lib/paths";
import { SourceMetadata } from "@/lib/types";

interface CitedRangesProps {
  source: SourceMetadata;
  slug: string;
}

// Format time in MM:SS format
function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number): string => n.toString().padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}`;
}

export default function CitedRanges({ source, slug }: CitedRangesProps) {
  // Check if this is a media source with time ranges
  const hasTimeRanges =
    (source.mergedTimeRanges && source.mergedTimeRanges.length > 0) || (source.startTime && source.endTime);

  // Check if this is a document source with page ranges
  const hasPageRanges = (source.mergedRanges && source.mergedRanges.length > 0) || (source.startPage && source.endPage);

  // Only render if we have ranges to display
  if (!hasTimeRanges && !hasPageRanges) {
    return null;
  }

  return (
    <>
      {/* Media citations (time ranges) */}
      {hasTimeRanges && (
        <>
          <div className="text-[12px] font-bold mb-4">Cited clips</div>
          {source.mergedTimeRanges && source.mergedTimeRanges.length > 0 ? (
            <div className="text-[#7749F8] text-sm">
              {source.mergedTimeRanges.map((range, index) => (
                <div key={index} className="my-2">
                  <span>
                    {formatTime(range.startTime)} - {formatTime(range.endTime)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[#7749F8] text-sm">
              <span>
                {source.startTime &&
                  source.endTime &&
                  `${formatTime(source.startTime)} - ${formatTime(source.endTime)}`}
              </span>
            </div>
          )}
        </>
      )}

      {/* Document citations (page ranges) */}
      {hasPageRanges && (
        <>
          <div className="text-[12px] font-bold mb-4">Cited text</div>
          {source.mergedRanges && source.mergedRanges.length > 0 ? (
            <div className="text-[#7749F8] text-sm">
              {source.mergedRanges.map((range, index) => (
                <div key={index} className="my-2">
                  <a href={getRagieSourcePath(slug, source.documentId, range.startPage)} target="_blank">
                    {range.startPage && range.endPage
                      ? range.startPage === range.endPage
                        ? `Page ${range.startPage}`
                        : `Pages ${range.startPage}-${range.endPage}`
                      : range.startPage
                        ? `Page ${range.startPage}`
                        : null}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[#7749F8] text-sm">
              <a href={getRagieSourcePath(slug, source.documentId, source.startPage)} target="_blank">
                {source.startPage &&
                  source.endPage &&
                  (source.startPage === source.endPage
                    ? `Page ${source.startPage}`
                    : `Pages ${source.startPage}-${source.endPage}`)}
              </a>
            </div>
          )}
        </>
      )}
    </>
  );
}
