// Verbatim element data from Instagram IGDS icon modules served by static.cdninstagram.com (fetched 2026-10-11), copied from
// components/mobile/clone/11/screen/igds-extra.ts. Keys name the source module.
type El = readonly ['path' | 'circle' | 'rect' | 'line' | 'polyline' | 'polygon', Readonly<Record<string, string>>];
export const igdsExtra = {
  /** IGDSMoreHorizontalPanoOutlineIcon */
  more: { viewBox: '0 0 24 24', els: [['circle', {"cx":"12","cy":"12","r":"1.5"}], ['circle', {"cx":"6","cy":"12","r":"1.5"}], ['circle', {"cx":"18","cy":"12","r":"1.5"}]] as readonly El[] },
  /** IGDSLinkPanoOutlineIcon */
  link: { viewBox: '0 0 24 24', els: [['path', {"d":"m9.726 5.123 1.228-1.228a6.47 6.47 0 0 1 9.15 9.152l-1.227 1.227m-4.603 4.603-1.228 1.228a6.47 6.47 0 0 1-9.15-9.152l1.227-1.227","fill":"none","stroke":"currentColor","strokeLinecap":"round","strokeLinejoin":"round","strokeWidth":"2"}], ['line', {"fill":"none","stroke":"currentColor","strokeLinecap":"round","strokeLinejoin":"round","strokeWidth":"2","x1":"8.471","x2":"15.529","y1":"15.529","y2":"8.471"}]] as readonly El[] },
  /** IGDSCircleCheckPanoFilledIcon */
  circleCheck: { viewBox: '0 0 24 24', els: [['path', {"d":"M12.001.504a11.5 11.5 0 1 0 11.5 11.5 11.513 11.513 0 0 0-11.5-11.5Zm5.706 9.21-6.5 6.495a1 1 0 0 1-1.414-.001l-3.5-3.503a1 1 0 1 1 1.414-1.414l2.794 2.796L16.293 8.3a1 1 0 0 1 1.414 1.415Z"}]] as readonly El[] },
} as const;
export type IgdsExtraName = keyof typeof igdsExtra;
