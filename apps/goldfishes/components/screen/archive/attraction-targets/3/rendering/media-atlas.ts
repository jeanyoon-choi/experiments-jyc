import {
  siAirbnb,
  siAlibabacloud,
  siAmd,
  siAnthropic,
  siApple,
  siArm,
  siAtlassian,
  siBaidu,
  siBroadcom,
  siBytedance,
  siCisco,
  siCloudflare,
  siCoinbase,
  siDatabricks,
  siDeepmind,
  siDeepseek,
  siDell,
  siDigitalocean,
  siDoordash,
  siDropbox,
  siGithub,
  siGitlab,
  siGoogle,
  siGrab,
  siHp,
  siHuawei,
  siHuggingface,
  siIntel,
  siLenovo,
  siMeta,
  siMistralai,
  siNaver,
  siNetflix,
  siNvidia,
  siPalantir,
  siPaypal,
  siPerplexity,
  siQualcomm,
  siSamsung,
  siSap,
  siShopify,
  siSnowflake,
  siSony,
  siSpacex,
  siSpotify,
  siStripe,
  siTesla,
  siTiktok,
  siUber,
  siVercel,
  siXiaomi,
  siZoom,
  type SimpleIcon,
} from "simple-icons";
import {
  MEDIA_ATLAS_COLUMNS,
  MEDIA_ATLAS_ROWS,
  MEDIA_ATLAS_TILE_SIZE,
  MEDIA_IMAGE_COUNTS as PHOTO_IMAGE_COUNTS,
  loadMediaAtlas as loadPhotoAtlas,
  type MediaSurface as PhotoSurface,
} from "./photo-media-atlas";

export { MEDIA_ATLAS_COLUMNS, MEDIA_ATLAS_ROWS };

export type MediaSurface = PhotoSurface | "company";
export type AttentionSurface = "white" | MediaSurface;

type CompanyLogo =
  | { kind: "icon"; icon: SimpleIcon }
  | { kind: "asset"; src: string };

// July 2026 snapshot: global AI, semiconductor, cloud, platform,
// enterprise-software, consumer-tech, and internet leaders.
const COMPANY_LOGOS: readonly CompanyLogo[] = [
  { kind: "asset", src: "/assets/goldfishes/assets/company-logos/openai.svg" },
  { kind: "icon", icon: siAnthropic },
  { kind: "asset", src: "/assets/goldfishes/assets/company-logos/sk-hynix.svg" },
  { kind: "icon", icon: siMeta },
  { kind: "asset", src: "/assets/goldfishes/assets/company-logos/amazon.svg" },
  { kind: "icon", icon: siApple },
  { kind: "icon", icon: siNetflix },
  { kind: "icon", icon: siGoogle },
  { kind: "asset", src: "/assets/goldfishes/assets/company-logos/microsoft.svg" },
  { kind: "icon", icon: siNvidia },
  { kind: "icon", icon: siSamsung },
  { kind: "asset", src: "/assets/goldfishes/assets/company-logos/tsmc.svg" },
  { kind: "asset", src: "/assets/goldfishes/assets/company-logos/asml.svg" },
  { kind: "icon", icon: siIntel },
  { kind: "icon", icon: siAmd },
  { kind: "icon", icon: siTesla },
  { kind: "icon", icon: siPalantir },
  { kind: "icon", icon: siCisco },
  { kind: "icon", icon: siSpotify },
  { kind: "icon", icon: siUber },
  { kind: "icon", icon: siAirbnb },
  { kind: "icon", icon: siCloudflare },
  { kind: "icon", icon: siDatabricks },
  { kind: "icon", icon: siDeepmind },
  { kind: "icon", icon: siDeepseek },
  { kind: "icon", icon: siBytedance },
  { kind: "icon", icon: siAlibabacloud },
  { kind: "icon", icon: siBroadcom },
  { kind: "icon", icon: siQualcomm },
  { kind: "icon", icon: siArm },
  { kind: "icon", icon: siSony },
  { kind: "icon", icon: siDell },
  { kind: "icon", icon: siHp },
  { kind: "icon", icon: siLenovo },
  { kind: "icon", icon: siXiaomi },
  { kind: "icon", icon: siHuawei },
  { kind: "icon", icon: siSap },
  { kind: "asset", src: "/assets/goldfishes/assets/company-logos/oracle.svg" },
  { kind: "asset", src: "/assets/goldfishes/assets/company-logos/salesforce.svg" },
  { kind: "asset", src: "/assets/goldfishes/assets/company-logos/adobe.svg" },
  { kind: "asset", src: "/assets/goldfishes/assets/company-logos/ibm.svg" },
  { kind: "asset", src: "/assets/goldfishes/assets/company-logos/micron.svg" },
  { kind: "asset", src: "/assets/goldfishes/assets/company-logos/servicenow.svg" },
  { kind: "icon", icon: siShopify },
  { kind: "icon", icon: siStripe },
  { kind: "icon", icon: siPaypal },
  { kind: "icon", icon: siCoinbase },
  { kind: "icon", icon: siSnowflake },
  { kind: "icon", icon: siAtlassian },
  { kind: "icon", icon: siZoom },
  { kind: "icon", icon: siDropbox },
  { kind: "icon", icon: siGithub },
  { kind: "icon", icon: siGitlab },
  { kind: "icon", icon: siVercel },
  { kind: "icon", icon: siDigitalocean },
  { kind: "icon", icon: siDoordash },
  { kind: "icon", icon: siGrab },
  { kind: "icon", icon: siBaidu },
  { kind: "icon", icon: siTiktok },
  { kind: "icon", icon: siMistralai },
  { kind: "icon", icon: siPerplexity },
  { kind: "icon", icon: siHuggingface },
  { kind: "icon", icon: siSpacex },
  { kind: "icon", icon: siNaver },
];

export const MEDIA_IMAGE_COUNTS: Record<MediaSurface, number> = {
  ...PHOTO_IMAGE_COUNTS,
  company: COMPANY_LOGOS.length,
};

let companyAtlasPromise: Promise<HTMLCanvasElement> | null = null;

function getLogoSource(logo: CompanyLogo) {
  if (logo.kind === "asset") return logo.src;
  const colouredSvg = logo.icon.svg.replace(
    "<svg ",
    `<svg fill="#${logo.icon.hex}" `,
  );
  return URL.createObjectURL(
    new Blob([colouredSvg], { type: "image/svg+xml" }),
  );
}

function loadLogo(logo: CompanyLogo) {
  const source = getLogoSource(logo);
  return new Promise<{ image: HTMLImageElement; objectUrl: string | null }>(
    (resolve, reject) => {
      const image = new Image();
      image.onload = () =>
        resolve({
          image,
          objectUrl: logo.kind === "icon" ? source : null,
        });
      image.onerror = () => {
        if (logo.kind === "icon") URL.revokeObjectURL(source);
        reject(new Error(`Unable to load company logo: ${source}`));
      };
      image.src = source;
    },
  );
}

function drawContainedLogo(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
) {
  const padding = 19;
  const availableSize = MEDIA_ATLAS_TILE_SIZE - padding * 2;
  const naturalWidth = image.naturalWidth || 24;
  const naturalHeight = image.naturalHeight || 24;
  const scale = Math.min(
    availableSize / naturalWidth,
    availableSize / naturalHeight,
  );
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  context.drawImage(
    image,
    x + (MEDIA_ATLAS_TILE_SIZE - width) / 2,
    y + (MEDIA_ATLAS_TILE_SIZE - height) / 2,
    width,
    height,
  );
}

async function buildCompanyAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = MEDIA_ATLAS_COLUMNS * MEDIA_ATLAS_TILE_SIZE;
  canvas.height = MEDIA_ATLAS_ROWS * MEDIA_ATLAS_TILE_SIZE;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Unable to create company logo atlas.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await Promise.all(
    COMPANY_LOGOS.map(async (logo, index) => {
      const { image, objectUrl } = await loadLogo(logo);
      const column = index % MEDIA_ATLAS_COLUMNS;
      const row = Math.floor(index / MEDIA_ATLAS_COLUMNS);
      drawContainedLogo(
        context,
        image,
        column * MEDIA_ATLAS_TILE_SIZE,
        row * MEDIA_ATLAS_TILE_SIZE,
      );
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }),
  );

  return canvas;
}

export function loadMediaAtlas(surface: MediaSurface) {
  if (surface !== "company") return loadPhotoAtlas(surface);
  companyAtlasPromise ??= buildCompanyAtlas().catch((error) => {
    companyAtlasPromise = null;
    throw error;
  });
  return companyAtlasPromise;
}
