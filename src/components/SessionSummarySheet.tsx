import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../design/colors';
import {Radius} from '../design/spacing';
import {Typography} from '../design/typography';
import {useLanguage, useT} from '../hooks/useT';
import {SessionRecord} from '../store/historyStore';
import {
  formatAngle,
  formatDuration,
  formatRelativeDay,
  formatTime,
} from '../utils/format';
import {loadColor, scoreColor} from '../utils/metrics';
import {BottomSheet} from './BottomSheet';
import {CircularProgress} from './CircularProgress';
import {LineChart} from './LineChart';
import {StatRow} from './StatRow';

interface Props {
  record: SessionRecord | null;
  visible: boolean;
  onClose: () => void;
  footer?: React.ReactNode;
}

export const SessionSummarySheet = ({
  record,
  visible,
  onClose,
  footer,
}: Props) => {
  const t = useT();
  const language = useLanguage();

  if (!record) {
    return null;
  }

  const outward = record.outwardThreshold ?? record.threshold;
  const extent = Math.max(15, Math.max(record.threshold, outward) + 5);
  const hasSteps = record.steps !== undefined && record.steps !== null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      subtitle={`${formatRelativeDay(
        record.startedAt,
        language,
      )} · ${formatTime(record.startedAt)}`}
      title={t('sessionSummaryTitle')}
      footer={footer}>
      <View style={styles.hero}>
        <CircularProgress
          size={112}
          strokeWidth={10}
          progress={record.balance}
          color={scoreColor(record.balance)}
          caption={t('balanceShort')}
        />
        <View style={styles.heroStats}>
          <Text style={styles.heroValue}>
            {formatDuration(record.durationMs)}
          </Text>
          <Text style={styles.heroLabel}>{t('duration')}</Text>
          {record.source === 'demo' && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoText}>{t('demoBadge')}</Text>
            </View>
          )}
        </View>
      </View>

      {record.trace.length > 1 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('tiltOverSession')}</Text>
          <LineChart
            data={record.trace}
            color={Colors.primary}
            height={120}
            min={-extent}
            max={extent}
            references={[
              {value: record.threshold, color: Colors.danger},
              {value: -outward, color: Colors.warning},
              {value: 0, color: Colors.textTertiary},
            ]}
            formatLabel={v => `${Math.round(v)}°`}
          />
        </View>
      )}

      <View style={styles.rows}>
        <StatRow
          label={t('avgStability')}
          value={`${record.avgStability}%`}
          valueColor={scoreColor(record.avgStability)}
        />
        <StatRow
          label={t('inwardLoad')}
          value={`${record.inwardPercent}%`}
          valueColor={loadColor(record.inwardPercent)}
        />
        <StatRow
          label={t('motorActivations')}
          value={`${record.motorActivations}`}
        />
        {record.outwardEvents !== undefined && (
          <StatRow
            label={t('outwardEvents')}
            value={`${record.outwardEvents}`}
            valueColor={record.outwardEvents > 0 ? Colors.warning : undefined}
          />
        )}
        <StatRow
          label={t('averageCorrection')}
          value={
            record.avgCorrectionMs > 0 ? `${record.avgCorrectionMs} ms` : '—'
          }
        />
        <StatRow label={t('peakTilt')} value={formatAngle(record.peakAngle)} />
        <StatRow
          label={t('averageTilt')}
          value={formatAngle(record.avgAngle)}
        />
        {hasSteps && (
          <>
            <StatRow label={t('steps')} value={`${record.steps}`} />
            <StatRow
              label={t('cadence')}
              value={
                record.cadence != null
                  ? t('cadenceValue', {value: record.cadence})
                  : '—'
              }
            />
          </>
        )}
        <StatRow
          label={t('inwardThreshold')}
          value={`${record.threshold}°`}
          last={record.outwardThreshold === undefined}
        />
        {record.outwardThreshold !== undefined && (
          <StatRow
            label={t('outwardThreshold')}
            value={`${record.outwardThreshold}°`}
            last
          />
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  heroStats: {
    marginLeft: 22,
    flex: 1,
  },
  heroValue: {
    ...Typography.display,
    fontSize: 40,
    color: Colors.textPrimary,
  },
  heroLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  demoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.violetSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  demoText: {
    color: Colors.violet,
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 20,
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
