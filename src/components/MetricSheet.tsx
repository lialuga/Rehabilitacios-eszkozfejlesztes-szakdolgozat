import React, {useRef} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useShallow} from 'zustand/react/shallow';
import {Colors} from '../design/colors';
import {Radius} from '../design/spacing';
import {Typography} from '../design/typography';
import {useT} from '../hooks/useT';
import {TranslationKey} from '../i18n/translations';
import {
  LiveMetrics,
  initialLiveMetrics,
  useLiveStore,
} from '../store/liveStore';
import {useSettingsStore} from '../store/settingsStore';
import {formatAngle} from '../utils/format';
import {loadColor, scoreColor} from '../utils/metrics';
import {BottomSheet} from './BottomSheet';
import {LineChart} from './LineChart';
import {StatRow} from './StatRow';

const FROZEN = {} as const;

export type MetricKey =
  | 'stability'
  | 'balance'
  | 'inward'
  | 'activations'
  | 'correction'
  | 'peak'
  | 'outward'
  | 'steps';

const meta: Record<
  MetricKey,
  {title: TranslationKey; description: TranslationKey}
> = {
  stability: {title: 'stabilityIndex', description: 'stabilityDescription'},
  balance: {title: 'balanceScore', description: 'balanceDescription'},
  inward: {title: 'inwardLoad', description: 'inwardDescription'},
  activations: {
    title: 'motorActivations',
    description: 'activationsDescription',
  },
  correction: {
    title: 'correctionLatency',
    description: 'correctionDescription',
  },
  peak: {title: 'peakTilt', description: 'peakDescription'},
  outward: {title: 'outwardEvents', description: 'outwardDescription'},
  steps: {title: 'steps', description: 'stepsDescription'},
};

interface Props {
  metric: MetricKey;
  visible: boolean;
  sessionActive: boolean;
  onClose: () => void;
}

export const MetricSheet = ({
  metric,
  visible,
  sessionActive,
  onClose,
}: Props) => {
  const t = useT();
  const threshold = useSettingsStore(state => state.inwardThreshold);
  const outward = useSettingsStore(state => state.outwardThreshold);
  const extent = Math.max(15, Math.max(threshold, outward) + 5);
  const snapshot = useLiveStore(
    useShallow(state => (visible ? state : FROZEN)),
  );
  const lastRef = useRef<LiveMetrics>(initialLiveMetrics);
  if (snapshot !== FROZEN) {
    lastRef.current = snapshot as LiveMetrics;
  }
  const live = lastRef.current;

  const hasData = live.source !== null;
  const dash = '—';
  const sessionValue = (value: string) => (sessionActive ? value : dash);

  let headline = dash;
  let headlineColor: string = Colors.textPrimary;
  let chart: React.ReactNode = null;
  let rows: {label: string; value: string; color?: string}[] = [];

  const rollChart = (
    <LineChart
      data={live.rollSeries}
      color={Colors.primary}
      min={-extent}
      max={extent}
      capacity={150}
      references={[
        {value: threshold, color: Colors.danger},
        {value: -outward, color: Colors.warning},
        {value: 0, color: Colors.textTertiary},
      ]}
      formatLabel={v => `${Math.round(v)}°`}
      emptyLabel={t('waitingForData')}
    />
  );

  switch (metric) {
    case 'stability':
      headline = hasData ? `${live.stability}%` : dash;
      headlineColor = scoreColor(live.stability);
      chart = (
        <LineChart
          data={live.stabilitySeries}
          color={Colors.accent}
          min={0}
          max={100}
          capacity={150}
          references={[{value: 80, color: Colors.accent}]}
          formatLabel={v => `${Math.round(v)}`}
          emptyLabel={t('waitingForData')}
        />
      );
      rows = [
        {label: t('currentValue'), value: headline},
        {
          label: t('ankleTilt'),
          value: hasData ? formatAngle(live.angle) : dash,
        },
        {label: t('targetRange'), value: '≥ 80%'},
      ];
      break;
    case 'balance':
      headline = hasData ? `${live.balance}` : dash;
      headlineColor = scoreColor(live.balance);
      chart = (
        <LineChart
          data={live.stabilitySeries}
          color={Colors.primary}
          min={0}
          max={100}
          capacity={150}
          formatLabel={v => `${Math.round(v)}`}
          emptyLabel={t('waitingForData')}
        />
      );
      rows = [
        {
          label: t('stabilityIndex'),
          value: hasData ? `${live.stability}%` : dash,
        },
        {label: t('inwardLoad'), value: sessionValue(`${live.inwardPercent}%`)},
        {label: t('balanceFormula'), value: '70% / 30%'},
      ];
      break;
    case 'inward':
      headline = sessionValue(`${live.inwardPercent}%`);
      headlineColor = loadColor(live.inwardPercent);
      chart = (
        <LineChart
          data={live.inwardSeries}
          color={Colors.warning}
          min={0}
          max={100}
          capacity={150}
          formatLabel={v => `${Math.round(v)}%`}
          emptyLabel={t('waitingForData')}
        />
      );
      rows = [
        {
          label: t('sessionShare'),
          value: sessionValue(`${live.inwardPercent}%`),
        },
        {
          label: t('recentShare'),
          value: hasData
            ? `${live.inwardSeries[live.inwardSeries.length - 1] ?? 0}%`
            : dash,
        },
        {label: t('inwardThreshold'), value: `${threshold}°`},
      ];
      break;
    case 'activations':
      headline = sessionValue(`${live.motorActivations}`);
      chart = rollChart;
      rows = [
        {label: t('motorActivations'), value: headline},
        {label: t('inwardThreshold'), value: `${threshold}°`},
      ];
      break;
    case 'correction':
      headline =
        sessionActive && live.avgCorrectionMs > 0
          ? `${live.avgCorrectionMs} ms`
          : dash;
      chart = rollChart;
      rows = [
        {label: t('averageCorrection'), value: headline},
        {
          label: t('motorActivations'),
          value: sessionValue(`${live.motorActivations}`),
        },
      ];
      break;
    case 'peak':
      headline = sessionValue(formatAngle(live.peakAngle));
      chart = rollChart;
      rows = [
        {label: t('peakTilt'), value: headline},
        {
          label: t('ankleTilt'),
          value: hasData ? formatAngle(live.angle) : dash,
        },
        {label: t('inwardThreshold'), value: `${threshold}°`},
      ];
      break;
    case 'outward':
      headline = sessionValue(`${live.outwardEvents}`);
      if (sessionActive && live.outwardEvents > 0) {
        headlineColor = Colors.warning;
      }
      chart = rollChart;
      rows = [
        {label: t('outwardEvents'), value: headline},
        {
          label: t('ankleTilt'),
          value: hasData ? formatAngle(live.angle) : dash,
        },
        {label: t('outwardThreshold'), value: `${outward}°`},
      ];
      break;
    case 'steps':
      headline = sessionActive && live.steps !== null ? `${live.steps}` : dash;
      rows = [
        {label: t('steps'), value: headline},
        {
          label: t('cadence'),
          value:
            live.cadence !== null
              ? t('cadenceValue', {value: live.cadence})
              : dash,
        },
      ];
      break;
  }

  if (headline === dash) {
    headlineColor = Colors.textTertiary;
  }

  const needsSession =
    !sessionActive && metric !== 'stability' && metric !== 'balance';
  const stepsMissing = metric === 'steps' && hasData && !live.stepsSupported;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t(meta[metric].title)}>
      <Text style={[styles.headline, {color: headlineColor}]}>{headline}</Text>
      <Text style={styles.description}>{t(meta[metric].description)}</Text>

      {(needsSession || stepsMissing) && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {stepsMissing ? t('stepsUnsupported') : t('metricNeedsSession')}
          </Text>
        </View>
      )}

      {chart && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('last15s')}</Text>
          {chart}
        </View>
      )}

      <View style={styles.rows}>
        {rows.map((row, index) => (
          <StatRow
            key={row.label}
            label={row.label}
            value={row.value}
            valueColor={row.color}
            last={index === rows.length - 1}
          />
        ))}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  headline: {
    ...Typography.display,
    fontSize: 44,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  notice: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: 14,
  },
  noticeText: {
    color: Colors.textPrimary,
    fontSize: 14,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 18,
  },
  chartTitle: {
    ...Typography.overline,
    color: Colors.textTertiary,
    marginBottom: 10,
  },
  rows: {
    marginTop: 8,
  },
});
