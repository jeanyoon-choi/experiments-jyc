import type { Dispatch, SetStateAction } from "react";
import { FILL_SIZE, FILLS, isSolidSurface, isTextSurface, KEYWORD_FONTS, KEYWORD_SIZE_RANGE, SURFACES, textSizeFor, type KeywordStyle, type SurfaceId } from "../media/catalogue";
import { BOREDOM_RANGE, CHURN_RANGE, FADE_RANGE, TREND_INTERVAL_RANGE, type MediaParameters } from "../media/model";
import { MAPPINGS, MEDIA_LOOK_CONTROLS, MEDIA_MODES, type MediaLook } from "../settings";
import { Chip, Chips, Note, Panel, Reset, Slider } from "./controls";

type Props = {
  surface: SurfaceId;
  onSurface: (surface: SurfaceId) => void;
  keywordStyle: KeywordStyle;
  setKeywordStyle: Dispatch<SetStateAction<KeywordStyle>>;
  onTouch: boolean;
  setOnTouch: (onTouch: boolean) => void;
  mapping: number;
  setMapping: (mapping: number) => void;
  media: MediaParameters;
  setMedia: Dispatch<SetStateAction<MediaParameters>>;
  mediaLook: MediaLook;
  setMediaLook: Dispatch<SetStateAction<MediaLook>>;
  carry: boolean;
  setCarry: Dispatch<SetStateAction<boolean>>;
  onDefaults: () => void;
};

export function MediaPanel({
  surface,
  onSurface,
  keywordStyle,
  setKeywordStyle,
  onTouch,
  setOnTouch,
  mapping,
  setMapping,
  media,
  setMedia,
  mediaLook,
  setMediaLook,
  carry,
  setCarry,
  onDefaults,
}: Props) {
  const solid = isSolidSurface(surface);
  /** 꽉 채움 lettering has its own mapping, holds still and stays on the pages: 입히기, 흐름 and 흐름 버블에도 do nothing to it. */
  const filled = keywordStyle.fill !== "none" && isTextSurface(surface);
  const setMediaValue = (change: Partial<MediaParameters>) => setMedia((current) => ({ ...current, ...change }));
  return (
    <Panel id="media" label="미디어">
      <Note>막 아래 비치는 것</Note>
      <Chips label="표면">
        {SURFACES.map((option) => (
          <Chip key={option.id} pressed={surface === option.id} onClick={() => onSurface(option.id)}>
            {option.label}
          </Chip>
        ))}
      </Chips>
      {isTextSurface(surface) && (
        <>
          <Note>키워드 글꼴</Note>
          <Chips label="키워드 글꼴">
            {KEYWORD_FONTS.map((option) => (
              <Chip key={option.id} pressed={keywordStyle.font === option.id} onClick={() => setKeywordStyle((current) => ({ ...current, font: option.id }))}>
                {option.label}
              </Chip>
            ))}
          </Chips>
          <Note>글자 배치</Note>
          <Chips label="글자 배치">
            {FILLS.map((option) => (
              <Chip
                key={option.id}
                pressed={keywordStyle.fill === option.id}
                onClick={() => setKeywordStyle((current) => ({ ...current, fill: option.id, size: option.id === "none" ? textSizeFor(surface) : FILL_SIZE }))}
              >
                {option.label}
              </Chip>
            ))}
          </Chips>
          {surface === "fomo" && (
            <>
              <Note>글자 색</Note>
              <Chips label="글자 색">
                <Chip pressed={!keywordStyle.brand} onClick={() => setKeywordStyle((current) => ({ ...current, brand: false }))}>
                  흰색
                </Chip>
                <Chip pressed={keywordStyle.brand} onClick={() => setKeywordStyle((current) => ({ ...current, brand: true }))}>
                  브랜드
                </Chip>
              </Chips>
            </>
          )}
          <Slider
            label="글자 크기"
            output={keywordStyle.size.toFixed(2)}
            ariaLabel={filled ? "글자 블록의 크기; 1이면 테두리까지" : `키워드 글자 크기; 기본 ${textSizeFor(surface)}`}
            min={KEYWORD_SIZE_RANGE[0]}
            max={KEYWORD_SIZE_RANGE[1]}
            step={0.05}
            value={keywordStyle.size}
            onChange={(size) => setKeywordStyle((current) => ({ ...current, size }))}
          />
          <Slider
            label="글자 불투명도"
            output={keywordStyle.opacity.toFixed(2)}
            ariaLabel="키워드 글자의 불투명도; 1이면 흰색"
            min={0}
            max={1}
            step={0.01}
            value={keywordStyle.opacity}
            onChange={(opacity) => setKeywordStyle((current) => ({ ...current, opacity }))}
          />
        </>
      )}
      <Note>보임</Note>
      <Chips label="보임">
        <Chip pressed={!onTouch} onClick={() => setOnTouch(false)}>
          항상
        </Chip>
        <Chip pressed={onTouch} onClick={() => setOnTouch(true)}>
          금붕어가 닿을 때만
        </Chip>
      </Chips>
      {!solid && !filled && (
        <>
          <Note>입히기</Note>
          <Chips label="입히기">
            {MAPPINGS.map((option) => (
              <Chip key={option.mode} pressed={mapping === option.mode} onClick={() => setMapping(option.mode)}>
                {option.label}
              </Chip>
            ))}
          </Chips>
        </>
      )}
      <Note>바뀜</Note>
      <Chips label="바뀜">
        {MEDIA_MODES.map((option) => (
          <Chip key={option.id} pressed={media.mode === option.id} onClick={() => setMediaValue({ mode: option.id })}>
            {option.label}
          </Chip>
        ))}
      </Chips>
      {media.mode === "churn" && (
        <Slider
          label="초당 바뀜 수"
          output={media.churnRate.toFixed(1)}
          ariaLabel="한 버블의 이미지가 초당 바뀌는 횟수"
          min={CHURN_RANGE[0]}
          max={CHURN_RANGE[1]}
          step={0.1}
          value={media.churnRate}
          onChange={(churnRate) => setMediaValue({ churnRate })}
        />
      )}
      {media.mode === "trend" && (
        <>
          <Slider
            label="새 유행 주기 (초)"
            output={media.trendInterval.toFixed(0)}
            ariaLabel="각 그룹의 선두 페이지가 새 이미지를 집어 드는 주기"
            min={TREND_INTERVAL_RANGE[0]}
            max={TREND_INTERVAL_RANGE[1]}
            step={1}
            value={media.trendInterval}
            onChange={(trendInterval) => setMediaValue({ trendInterval })}
          />
          <Slider
            label="따라갈 확률"
            output={media.follow.toFixed(2)}
            ariaLabel="몫이 도착할 때 보내는 페이지가 더 높은 페이지의 이미지를 베낄 확률"
            min={0}
            max={1}
            step={0.01}
            value={media.follow}
            onChange={(follow) => setMediaValue({ follow })}
          />
          <Slider
            label="싫증 (초)"
            output={media.boredom === 0 ? "없음" : media.boredom.toFixed(0)}
            ariaLabel="한 이미지를 이만큼 본 페이지가 다른 것을 찾는 시간; 0이면 없음"
            min={BOREDOM_RANGE[0]}
            max={BOREDOM_RANGE[1]}
            step={1}
            value={media.boredom}
            onChange={(boredom) => setMediaValue({ boredom })}
          />
        </>
      )}
      {(media.mode !== "fixed" || onTouch) && (
        <Slider
          label="바뀜 부드럽게 (초)"
          output={media.fade.toFixed(2)}
          ariaLabel="이미지가 바뀌는 데 걸리는 시간"
          min={FADE_RANGE[0]}
          max={FADE_RANGE[1]}
          step={0.05}
          value={media.fade}
          onChange={(fade) => setMediaValue({ fade })}
        />
      )}
      {MEDIA_LOOK_CONTROLS.filter((control) => !(solid && control.key === "filmOverMedia") && !(filled && control.key === "mediaDrift")).map((control) => (
        <Slider
          key={control.key}
          label={control.label}
          output={mediaLook[control.key].toFixed(2)}
          ariaLabel={control.label}
          min={control.min}
          max={control.max}
          step={control.step}
          value={mediaLook[control.key]}
          onChange={(value) => setMediaLook((current) => ({ ...current, [control.key]: value }))}
        />
      ))}
      {!filled && (
        <Chips label="흐름 버블">
          <Chip pressed={carry} onClick={() => setCarry((current) => !current)}>
            흐름 버블에도
          </Chip>
        </Chips>
      )}
      <Reset onClick={onDefaults}>기본값으로</Reset>
    </Panel>
  );
}
