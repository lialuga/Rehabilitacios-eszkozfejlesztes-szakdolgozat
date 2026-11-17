import React, {useEffect, useMemo, useRef, useState} from 'react';
import {LayoutChangeEvent, StyleSheet, Text, View} from 'react-native';
import Svg, {Defs, Line, LinearGradient, Path, Stop} from 'react-native-svg';
import {Colors} from '../design/colors';

interface ReferenceLine {
  value: number;
  color: string;
  label?: string;
}

interface Props {
  data: number[];
  color: string;
  height?: number;
  min?: number;
  max?: number;
  symmetric?: boolean;
  capacity?: number;
  references?: ReferenceLine[];
  formatLabel?: (value: number) => string;
  emptyLabel?: string;
}

const PAD_TOP = 8;
const PAD_BOTTOM = 8;
const LABEL_WIDTH = 34;
const MEASURE_RETRIES = 10;
const MEASURE_RETRY_MS = 100;

export const LineChart = ({
  data,
  color,
  height = 140,
  min,
  max,
  symmetric,
  capacity,
  references = [],
  formatLabel = v => `${Math.round(v)}`,
  emptyLabel,
}: Props) => {
  const [width, setWidth] = useState(0);
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (width > 0) {
      return;
    }
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const measure = () => {
      containerRef.current?.measure((_x, _y, measuredWidth) => {
        if (measuredWidth > 0) {
          setWidth(measuredWidth);
        } else if (++attempts < MEASURE_RETRIES) {
          timer = setTimeout(measure, MEASURE_RETRY_MS);
        }
      });
    };
    timer = setTimeout(measure, MEASURE_RETRY_MS);
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [width]);
  const gradientId = useMemo(
    () =>
      `fill-${color.replace(/[^a-z0-9]/gi, '')}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
    [color],
  );

  const domain = useMemo(() => {
    const refs = references.map(r => r.value);
    let lo = min ?? Math.min(...data, ...refs);
    let hi = max ?? Math.max(...data, ...refs);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = 0;
      hi = 1;
    }
    if (symmetric) {
      const extent =
        Math.ceil((Math.max(Math.abs(lo), Math.abs(hi), 1) * 1.1) / 5) * 5;
      return {lo: -extent, hi: extent};
    }
    if (hi - lo < 1e-6) {
      hi += 1;
      lo -= 1;
    }
    const pad = min === undefined || max === undefined ? (hi - lo) * 0.12 : 0;
    return {lo: min ?? lo - pad, hi: max ?? hi + pad};
  }, [data, min, max, symmetric, references]);

  const plotWidth = Math.max(0, width - LABEL_WIDTH);
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;

  const y = (value: number) =>
    PAD_TOP +
    plotHeight -
    ((value - domain.lo) / (domain.hi - domain.lo)) * plotHeight;

  const {line, area} = useMemo(() => {
    if (plotWidth <= 0 || data.length < 2) {
      return {line: '', area: ''};
    }
    const slots = Math.max(capacity ?? data.length, data.length);
    const step = plotWidth / (slots - 1);
    const offset = (slots - data.length) * step;
    let d = '';
    data.forEach((value, i) => {
      const px = offset + i * step;
      const py = y(value);
      d += `${i === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`;
    });
    const bottom = PAD_TOP + plotHeight;
    const firstX = offset.toFixed(1);
    return {
      line: d,
      area: `${d}L${plotWidth.toFixed(1)} ${bottom}L${firstX} ${bottom}Z`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, plotWidth, plotHeight, domain, capacity]);

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);

  return (
    <View ref={containerRef} style={{height}} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {[0, 0.5, 1].map(f => {
            const gy = PAD_TOP + plotHeight * f;
            return (
              <Line
                key={f}
                x1={0}
                x2={plotWidth}
                y1={gy}
                y2={gy}
                stroke={Colors.border}
                strokeWidth={1}
              />
            );
          })}

          {references.map(ref =>
            ref.value > domain.lo && ref.value < domain.hi ? (
              <Line
                key={`${ref.value}-${ref.color}`}
                x1={0}
                x2={plotWidth}
                y1={y(ref.value)}
                y2={y(ref.value)}
                stroke={ref.color}
                strokeOpacity={0.7}
                strokeWidth={1.2}
                strokeDasharray="4 5"
              />
            ) : null,
          )}

          {!!area && <Path d={area} fill={`url(#${gradientId})`} />}
          {!!line && (
            <Path
              d={line}
              stroke={color}
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </Svg>
      )}

      {width > 0 && (
        <>
          <Text style={[styles.axisLabel, {top: PAD_TOP - 7}]}>
            {formatLabel(domain.hi)}
          </Text>
          <Text style={[styles.axisLabel, {top: PAD_TOP + plotHeight / 2 - 7}]}>
            {formatLabel((domain.hi + domain.lo) / 2)}
          </Text>
          <Text style={[styles.axisLabel, {top: PAD_TOP + plotHeight - 7}]}>
            {formatLabel(domain.lo)}
          </Text>
        </>
      )}

      {data.length < 2 && !!emptyLabel && (
        <View style={styles.empty} pointerEvents="none">
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  axisLabel: {
    position: 'absolute',
    right: 0,
    width: LABEL_WIDTH - 6,
    textAlign: 'right',
    fontSize: 10,
    lineHeight: 14,
    color: Colors.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textTertiary,
    fontSize: 13,
  },
});
