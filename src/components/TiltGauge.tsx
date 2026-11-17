import React, {useEffect, useState} from 'react';
import {LayoutChangeEvent, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Line, Path} from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {Colors} from '../design/colors';
import {Radius} from '../design/spacing';
import {Typography} from '../design/typography';
import {useT} from '../hooks/useT';
import {formatAngle} from '../utils/format';
import {TiltZone, getTiltZone, zoneColor} from '../utils/metrics';

const RANGE = 20;
const STROKE = 12;
const NEEDLE_INSET = 26;

interface Props {
  angle: number;
  threshold: number;
  outwardThreshold?: number;
  hasData: boolean;
}

const toRotation = (angle: number) =>
  (Math.max(-RANGE, Math.min(RANGE, angle)) / RANGE) * 90;

const polar = (cx: number, cy: number, r: number, rotationDeg: number) => {
  const rad = (rotationDeg * Math.PI) / 180;
  return {x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad)};
};

const arcPath = (
  cx: number,
  cy: number,
  r: number,
  from: number,
  to: number,
) => {
  const a = polar(cx, cy, r, toRotation(from));
  const b = polar(cx, cy, r, toRotation(to));
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
};

const TICKS = [-20, -15, -10, -5, 0, 5, 10, 15, 20];

const GaugeArcs = React.memo(
  ({
    width,
    threshold,
    outwardThreshold,
    zone,
  }: {
    width: number;
    threshold: number;
    outwardThreshold: number;
    zone: TiltZone | null;
  }) => {
    const r = Math.max(0, width / 2 - STROKE);
    const cx = width / 2;
    const cy = r + STROKE;
    const height = cy + STROKE;
    const opacity = (z: TiltZone) => (zone === z ? 0.9 : 0.28);

    return (
      <Svg width={width} height={height}>
        <Path
          d={arcPath(cx, cy, r, -RANGE, RANGE)}
          stroke={Colors.surfaceHighlight}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={arcPath(cx, cy, r, -RANGE, -outwardThreshold)}
          stroke={Colors.warning}
          strokeOpacity={opacity('outward')}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={arcPath(cx, cy, r, threshold, RANGE)}
          stroke={Colors.danger}
          strokeOpacity={opacity('inward')}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={arcPath(cx, cy, r, -outwardThreshold, threshold)}
          stroke={Colors.accent}
          strokeOpacity={opacity('neutral')}
          strokeWidth={STROKE}
          fill="none"
        />
        {TICKS.map(tick => {
          const outer = polar(cx, cy, r - STROKE / 2 - 4, toRotation(tick));
          const inner = polar(
            cx,
            cy,
            r - STROKE / 2 - (tick % 10 === 0 ? 12 : 8),
            toRotation(tick),
          );
          return (
            <Line
              key={tick}
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              stroke={Colors.textTertiary}
              strokeOpacity={tick === 0 ? 0.9 : 0.5}
              strokeWidth={tick === 0 ? 2 : 1.2}
              strokeLinecap="round"
            />
          );
        })}
        <Circle cx={cx} cy={cy} r={9} fill={Colors.surfaceHighlight} />
      </Svg>
    );
  },
);

export const TiltGauge = ({
  angle,
  threshold,
  outwardThreshold = threshold,
  hasData,
}: Props) => {
  const t = useT();
  const [width, setWidth] = useState(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(hasData ? toRotation(angle) : 0, {
      duration: 140,
      easing: Easing.out(Easing.quad),
    });
  }, [angle, hasData, rotation]);

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value}deg`}],
  }));

  const zone = getTiltZone(angle, threshold, outwardThreshold);
  const color = hasData ? zoneColor[zone] : Colors.textTertiary;

  const r = Math.max(0, width / 2 - STROKE);
  const cx = width / 2;
  const cy = r + STROKE;
  const height = cy + STROKE;

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(Math.min(event.nativeEvent.layout.width, 320));

  return (
    <View style={styles.wrap}>
      <View style={styles.gaugeArea} onLayout={onLayout}>
        {width > 0 && (
          <View style={{width, height}}>
            <GaugeArcs
              width={width}
              threshold={threshold}
              outwardThreshold={outwardThreshold}
              zone={hasData ? zone : null}
            />

            <Animated.View
              pointerEvents="none"
              style={[
                styles.needleFrame,
                {left: cx - r, top: cy - r, width: r * 2, height: r * 2},
                needleStyle,
              ]}>
              <View
                style={[
                  styles.needle,
                  {
                    left: r - 2,
                    top: NEEDLE_INSET,
                    height: r - NEEDLE_INSET,
                    backgroundColor: color,
                  },
                ]}
              />
            </Animated.View>
            <View
              pointerEvents="none"
              style={[
                styles.hub,
                {left: cx - 5, top: cy - 5, backgroundColor: color},
              ]}
            />
          </View>
        )}
      </View>

      <View style={styles.scaleLabels}>
        <Text style={styles.scaleText}>{t('gaugeOutward')}</Text>
        <Text style={styles.scaleText}>{t('gaugeInward')}</Text>
      </View>

      <Text
        style={[
          styles.value,
          {color: hasData ? Colors.textPrimary : Colors.textTertiary},
        ]}
        accessibilityLabel={
          hasData ? `${t('ankleAngle')} ${formatAngle(angle)}` : t('noData')
        }>
        {hasData ? formatAngle(angle) : '—'}
      </Text>

      <View
        style={[
          styles.zoneChip,
          {backgroundColor: hasData ? `${color}22` : Colors.surfaceHighlight},
        ]}>
        <Text style={[styles.zoneText, {color}]}>
          {hasData
            ? t(
                zone === 'neutral'
                  ? 'zoneNeutral'
                  : zone === 'inward'
                  ? 'zoneInward'
                  : 'zoneOutward',
              )
            : t('noData')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  gaugeArea: {
    width: '100%',
    alignItems: 'center',
  },
  needleFrame: {
    position: 'absolute',
  },
  needle: {
    position: 'absolute',
    width: 4,
    borderRadius: 2,
  },
  hub: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scaleLabels: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 6,
  },
  scaleText: {
    ...Typography.overline,
    fontSize: 10,
    color: Colors.textTertiary,
  },
  value: {
    ...Typography.display,
    marginTop: 2,
  },
  zoneChip: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  zoneText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
