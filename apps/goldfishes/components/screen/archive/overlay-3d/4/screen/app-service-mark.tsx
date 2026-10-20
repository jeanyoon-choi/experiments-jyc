import type { CSSProperties } from "react";
import type { SimpleIcon } from "simple-icons";
import {
  siAirbnb,
  siAirtable,
  siAliexpress,
  siAnthropic,
  siApplepay,
  siApplemusic,
  siAppletv,
  siAsana,
  siAudible,
  siBilibili,
  siBinance,
  siBluesky,
  siBookingdotcom,
  siCashapp,
  siCrunchyroll,
  siDeepseek,
  siDiscord,
  siDoordash,
  siDropbox,
  siEbay,
  siEpicgames,
  siEtsy,
  siEvernote,
  siExpedia,
  siFacebook,
  siFigma,
  siGithubcopilot,
  siGmail,
  siGooglecalendar,
  siGooglechrome,
  siGoogledrive,
  siGooglegemini,
  siGooglemaps,
  siGooglemeet,
  siGooglepay,
  siGooglephotos,
  siHuggingface,
  siInstagram,
  siKakaotalk,
  siLine,
  siMastodon,
  siMessenger,
  siNaver,
  siNetflix,
  siNotion,
  siPaypal,
  siPerplexity,
  siPinterest,
  siPlex,
  siRakuten,
  siReddit,
  siSamsungpay,
  siShopee,
  siSnapchat,
  siSoundcloud,
  siSpotify,
  siSteam,
  siSwiggy,
  siTelegram,
  siThreads,
  siTidal,
  siTiktok,
  siTodoist,
  siTrello,
  siTripadvisor,
  siTwitch,
  siUber,
  siUbereats,
  siVenmo,
  siVimeo,
  siVlcmediaplayer,
  siWechat,
  siWhatsapp,
  siX,
  siYoutube,
  siYoutubemusic,
  siZomato,
  siZoom,
} from "simple-icons";
import styles from "./story-tray.module.css";

type AppService = Readonly<{
  name: string;
  icon?: SimpleIcon;
  image?: string;
  background?: string;
}>;

const icon = (name: string, value: SimpleIcon): AppService => ({ name, icon: value });
const image = (name: string, source: string): AppService => ({ name, image: source, background: "#fff" });

// Categories are deliberately interleaved so neighboring story circles read as
// a mixed everyday service field instead of five contiguous brand blocks.
const APP_SERVICES: readonly AppService[] = [
  image("ChatGPT", "/assets/goldfishes/assets/company-logos/openai.svg"),
  icon("WhatsApp", siWhatsapp),
  icon("Spotify", siSpotify),
  image("Amazon", "/assets/goldfishes/assets/company-logos/amazon.svg"),
  icon("Google Maps", siGooglemaps),
  icon("Google Gemini", siGooglegemini),
  icon("Instagram", siInstagram),
  icon("Netflix", siNetflix),
  icon("AliExpress", siAliexpress),
  icon("Google Chrome", siGooglechrome),
  icon("Claude", siAnthropic),
  icon("YouTube", siYoutube),
  icon("Apple Music", siApplemusic),
  icon("Uber", siUber),
  icon("PayPal", siPaypal),
  icon("Perplexity", siPerplexity),
  icon("Facebook", siFacebook),
  icon("YouTube Music", siYoutubemusic),
  icon("eBay", siEbay),
  icon("Google Pay", siGooglepay),
  icon("DeepSeek", siDeepseek),
  icon("TikTok", siTiktok),
  icon("SoundCloud", siSoundcloud),
  icon("Etsy", siEtsy),
  icon("Apple Pay", siApplepay),
  icon("GitHub Copilot", siGithubcopilot),
  icon("WeChat", siWechat),
  icon("Audible", siAudible),
  icon("Shopee", siShopee),
  icon("Samsung Pay", siSamsungpay),
  icon("Hugging Face", siHuggingface),
  icon("Telegram", siTelegram),
  icon("Steam", siSteam),
  icon("Uber Eats", siUbereats),
  icon("Binance", siBinance),
  icon("Notion", siNotion),
  icon("Messenger", siMessenger),
  icon("Epic Games", siEpicgames),
  icon("Airbnb", siAirbnb),
  icon("Venmo", siVenmo),
  icon("Zoom", siZoom),
  icon("Snapchat", siSnapchat),
  icon("Vimeo", siVimeo),
  icon("Booking.com", siBookingdotcom),
  icon("Cash App", siCashapp),
  icon("Google Drive", siGoogledrive),
  icon("X", siX),
  icon("Bilibili", siBilibili),
  icon("DoorDash", siDoordash),
  icon("Google Photos", siGooglephotos),
  icon("Gmail", siGmail),
  icon("Threads", siThreads),
  icon("Crunchyroll", siCrunchyroll),
  icon("Zomato", siZomato),
  icon("Google Calendar", siGooglecalendar),
  icon("Discord", siDiscord),
  icon("Plex", siPlex),
  icon("Swiggy", siSwiggy),
  icon("Google Meet", siGooglemeet),
  icon("Reddit", siReddit),
  icon("Apple TV", siAppletv),
  icon("Tripadvisor", siTripadvisor),
  icon("Dropbox", siDropbox),
  icon("Pinterest", siPinterest),
  icon("TIDAL", siTidal),
  icon("Expedia", siExpedia),
  icon("Figma", siFigma),
  icon("Twitch", siTwitch),
  icon("VLC", siVlcmediaplayer),
  icon("Rakuten", siRakuten),
  icon("Trello", siTrello),
  icon("LINE", siLine),
  icon("Asana", siAsana),
  icon("KakaoTalk", siKakaotalk),
  icon("Todoist", siTodoist),
  icon("Naver", siNaver),
  icon("Airtable", siAirtable),
  icon("Bluesky", siBluesky),
  icon("Evernote", siEvernote),
  icon("Mastodon", siMastodon),
];

function foregroundFor(hex: string) {
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const luminance = channels.reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
  return luminance > 0.62 ? "#07090b" : "#fff";
}

export function AppServiceMark({ index }: { index: number }) {
  const service = APP_SERVICES[index % APP_SERVICES.length]!;
  const background = service.background ?? `#${service.icon?.hex ?? "fff"}`;
  const style = { "--app-service-background": background } as CSSProperties;

  return (
    <span className={styles.appServiceSurface} data-service={service.name} style={style}>
      {service.icon ? (
        <svg aria-hidden="true" className={styles.appServiceMark} fill={foregroundFor(service.icon.hex)} viewBox="0 0 24 24">
          <path d={service.icon.path} />
        </svg>
      ) : (
        <img alt="" className={styles.appServiceImage} src={service.image} />
      )}
    </span>
  );
}

export const APP_SERVICE_COUNT = APP_SERVICES.length;
