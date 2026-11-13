"use client";

import {
  Components,
  createPlugin,
  invertedRange,
  range,
  styled,
  useDrag,
  useInputContext,
  useTh,
  type InternalNumberSettings,
} from "leva/plugin";
import { useRef } from "react";

type UnboundedNumberSettings = {
  value: number;
  min: number;
  max: number;
  step: number;
};

type UnboundedNumberPluginInput = {
  value: UnboundedNumberSettings;
};

type UnboundedNumberProps = {
  displayValue: string;
  id?: string;
  key?: string;
  label: string;
  onChange: (value: string) => void;
  onUpdate: (value: number | ((value: number) => number)) => void;
  settings: InternalNumberSettings;
  value: number;
};

const RangeGrid = styled("div", {
  variants: {
    hasRange: {
      true: {
        position: "relative",
        display: "grid",
        gridTemplateColumns: "auto $sizes$numberInputMinWidth",
        columnGap: "$colGap",
        alignItems: "center",
      },
    },
  },
});

const Range = styled("div", {
  position: "relative",
  width: "100%",
  height: 2,
  borderRadius: "$xs",
  backgroundColor: "$elevation1",
});

const RangeWrapper = styled("div", {
  position: "relative",
  $flex: "",
  height: "100%",
  cursor: "pointer",
  touchAction: "none",
});

const Indicator = styled("div", {
  position: "absolute",
  height: "100%",
  backgroundColor: "$accent2",
});

const Scrubber = styled("div", {
  position: "absolute",
  width: "$scrubberWidth",
  height: "$scrubberHeight",
  borderRadius: "$xs",
  boxShadow: "0 0 0 2px $colors$elevation2",
  backgroundColor: "$accent2",
  cursor: "pointer",
  $active: "none $accent1",
  $hover: "none $accent3",
});

function getDecimalPlaces(step: number) {
  const decimal = `${step}`.split(".")[1];
  return Math.min(2, decimal?.length ?? 0);
}

function snapToStep(value: number, step: number, initialValue: number) {
  const steps = Math.round((value - initialValue) / step);
  return initialValue + steps * step;
}

function UnboundedRangeSlider({
  initialValue,
  max,
  min,
  onDrag,
  step,
  value,
}: {
  initialValue: number;
  max: number;
  min: number;
  onDrag: (value: number) => void;
  step: number;
  value: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const rangeWidth = useRef(0);
  const scrubberWidth = String(useTh("sizes", "scrubberWidth"));
  const bind = useDrag(({ event, first, movement: [movementX], memo, xy: [x] }) => {
    if (first) {
      const { left, width } = ref.current!.getBoundingClientRect();
      rangeWidth.current = width - Number.parseFloat(scrubberWidth);
      memo =
        event?.target === scrubberRef.current
          ? value
          : invertedRange((x - left) / width, min, max);
    }
    const nextValue = memo + invertedRange(movementX / rangeWidth.current, 0, max - min);
    onDrag(snapToStep(nextValue, step, initialValue));
    return memo;
  });
  const position = range(value, min, max);

  return (
    <RangeWrapper ref={ref} {...bind()}>
      <Range>
        <Indicator style={{ left: 0, right: `${(1 - position) * 100}%` }} />
      </Range>
      <Scrubber
        ref={scrubberRef}
        style={{ left: `calc(${position} * (100% - ${scrubberWidth}))` }}
      />
    </RangeWrapper>
  );
}

function UnboundedNumberComponent() {
  const props = useInputContext<UnboundedNumberProps>();
  const { id, label, onUpdate, settings, value } = props;
  const { key: _unusedKey, ...numberProps } = props;
  const { max, min } = settings;
  const hasRange = max !== Infinity && min !== -Infinity;

  return (
    <Components.Row input>
      <Components.Label>{label}</Components.Label>
      <RangeGrid hasRange={hasRange}>
        {hasRange && (
          <UnboundedRangeSlider
            initialValue={settings.initialValue}
            max={max}
            min={min}
            onDrag={onUpdate}
            step={settings.step}
            value={value}
          />
        )}
        <Components.Number
          {...numberProps}
          id={id}
          innerLabelTrim={hasRange ? 0 : 1}
          label="value"
        />
      </RangeGrid>
    </Components.Row>
  );
}

export const unboundedNumber = createPlugin<
  UnboundedNumberPluginInput,
  number,
  InternalNumberSettings
>({
  component: UnboundedNumberComponent,
  format: (value, settings) => {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return "0";
    return nextValue.toFixed(settings?.pad ?? 0);
  },
  normalize: (input) => {
    const { max, min, step, value } = input as unknown as UnboundedNumberSettings;
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) throw new Error("Invalid number");
    const nextMin = Number.isFinite(min) ? min : -Infinity;
    const nextMax = Number.isFinite(max) ? max : Infinity;
    const nextStep = Number.isFinite(step) && step > 0 ? step : 1;

    return {
      value: nextValue,
      settings: {
        initialValue: nextValue,
        max: nextMax,
        min: nextMin,
        pad: getDecimalPlaces(nextStep),
        step: nextStep,
      },
    };
  },
  sanitize: (value) => {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) throw new Error("Invalid number");
    return nextValue;
  },
});

export function unboundedRange(
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (value: number) => void,
) {
  return unboundedNumber({ value: { value, min, max, step }, onChange });
}
