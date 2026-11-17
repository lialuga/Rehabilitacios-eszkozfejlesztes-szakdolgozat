import React, {useCallback, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {bleService} from '../ble/bleService';
import {useConnectionStore} from '../store/connectionStore';
import {useShallow} from 'zustand/react/shallow';
import {Button} from '../components/Button';
import {Card} from '../components/Card';
import {ConnectHero, ConnectionStrip} from '../components/ConnectionCard';
import {LineChart} from '../components/LineChart';
import {MetricTile} from '../components/MetricTile';
import {ScreenHeader} from '../components/ScreenHeader';
import {SectionHeader} from '../components/SectionHeader';
import {SessionCard} from '../components/SessionCard';
import {StatusPill} from '../components/StatusPill';
import {TiltGauge} from '../components/TiltGauge';
import {MetricSheet, MetricKey} from '../components/MetricSheet';
import {SessionSummarySheet} from '../components/SessionSummarySheet';
import {Colors} from '../design/colors';
import {Radius, TAB_BAR_CLEARANCE} from '../design/spacing';
import {Typography} from '../design/typography';
import {DataStatus, useDataStatus} from '../hooks/useDataStatus';
import {useLanguage, useT} from '../hooks/useT';
import {SessionRecord} from '../store/historyStore';
import {useLiveStore} from '../store/liveStore';
import {useSessionStore} from '../store/sessionStore';
import {useSettingsStore} from '../store/settingsStore';
import {formatAngle, formatWeekdayDate} from '../utils/format';
import {loadColor, scoreColor} from '../utils/metrics';

const SERIES_CAPACITY = 150;

const hasLiveData = (status: DataStatus) =>
  status === 'live' || status === 'demo';

const GaugeCard = React.memo(({dataStatus}: {dataStatus: DataStatus}) => {
  const t = useT();
  const angle = useLiveStore(state => state.angle);
  const threshold = useSettingsStore(state => state.inwardThreshold);
  const outward = useSettingsStore(state => state.outwardThreshold);
  const controlSupported = useConnectionStore(state => state.controlSupported);

  return (
    <Card style={styles.gaugeCard}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.overline}>{t('ankleAngle')}</Text>
        <View style={styles.cardHeaderRight}>
          <Text style={styles.cardHint}>
            {t('thresholdsShort', {inward: threshold, outward})}
          </Text>
          {dataStatus === 'live' && controlSupported && (
            <Pressable
              onPress={() => bleService.calibrate()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityHint={t('calibrateHint')}
              style={({pressed}) => [
                styles.zeroButton,
                pressed && styles.zeroPressed,
              ]}>
              <Text style={styles.zeroText}>{t('zeroShort')}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <TiltGauge
        angle={angle}
        threshold={threshold}
        outwardThreshold={outward}
        hasData={hasLiveData(dataStatus)}
      />
    </Card>
  );
});

const TrendCard = React.memo(() => {
  const t = useT();
  const roll = useLiveStore(state => state.rollSeries);
  const threshold = useSettingsStore(state => state.inwardThreshold);
  const outward = useSettingsStore(state => state.outwardThreshold);
  const extent = Math.max(15, Math.max(threshold, outward) + 5);

  return (
    <Card>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.overline}>{t('realTimeTrend')}</Text>
        <Text style={styles.cardHint}>{t('last15s')}</Text>
      </View>
      <View style={styles.chartWrap}>
        <LineChart
          data={roll}
          color={Colors.primary}
          height={150}
          min={-extent}
          max={extent}
          capacity={SERIES_CAPACITY}
          references={[
            {value: threshold, color: Colors.danger},
            {value: -outward, color: Colors.warning},
            {value: 0, color: Colors.textTertiary},
          ]}
          formatLabel={v => `${Math.round(v)}°`}
          emptyLabel={t('waitingForData')}
        />
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendSwatch, {backgroundColor: Colors.primary}]}
          />
          <Text style={styles.legendText}>{t('ankleTilt')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendInward]} />
          <Text style={styles.legendText}>{t('inwardThreshold')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendOutward]} />
          <Text style={styles.legendText}>{t('outwardThreshold')}</Text>
        </View>
      </View>
    </Card>
  );
});

const MetricsGrid = React.memo(
  ({
    sessionActive,
    onOpen,
  }: {
    sessionActive: boolean;
    onOpen: (key: MetricKey) => void;
  }) => {
    const t = useT();
    const live = useLiveStore(
      useShallow(state => ({
        stability: state.stability,
        balance: state.balance,
        inward: state.inwardPercent,
        activations: state.motorActivations,
        outward: state.outwardEvents,
        correction: state.avgCorrectionMs,
        peak: state.peakAngle,
        steps: state.steps,
        cadence: state.cadence,
        stepsSupported: state.stepsSupported,
        hasData: state.source !== null,
      })),
    );

    const dash = '—';
    const sessionCaption = t('startToMeasure');
    const stepsCaption =
      live.hasData && !live.stepsSupported
        ? t('stepsUnsupported')
        : live.cadence !== null
        ? t('cadenceValue', {value: live.cadence})
        : sessionCaption;

    return (
      <View>
        <View style={styles.gridRow}>
          <MetricTile
            icon="target"
            tint={Colors.accent}
            label={t('stabilityIndex')}
            value={live.hasData ? `${live.stability}` : dash}
            unit={live.hasData ? '%' : undefined}
            valueColor={
              live.hasData ? scoreColor(live.stability) : Colors.textTertiary
            }
            progress={live.hasData ? live.stability : undefined}
            caption={t('liveLabel')}
            onPress={() => onOpen('stability')}
          />
          <View style={styles.gridGap} />
          <MetricTile
            icon="scale"
            tint={Colors.primary}
            label={t('balanceScore')}
            value={live.hasData ? `${live.balance}` : dash}
            valueColor={
              live.hasData ? scoreColor(live.balance) : Colors.textTertiary
            }
            progress={live.hasData ? live.balance : undefined}
            caption={t('liveLabel')}
            onPress={() => onOpen('balance')}
          />
        </View>
        <View style={styles.gridRow}>
          <MetricTile
            icon="arrowInward"
            tint={Colors.warning}
            label={t('inwardLoad')}
            value={sessionActive ? `${live.inward}` : dash}
            unit={sessionActive ? '%' : undefined}
            valueColor={
              sessionActive ? loadColor(live.inward) : Colors.textTertiary
            }
            progress={sessionActive ? live.inward : undefined}
            caption={sessionCaption}
            onPress={() => onOpen('inward')}
          />
          <View style={styles.gridGap} />
          <MetricTile
            icon="zap"
            tint={Colors.violet}
            label={t('motorActivations')}
            value={sessionActive ? `${live.activations}` : dash}
            valueColor={
              sessionActive ? Colors.textPrimary : Colors.textTertiary
            }
            caption={sessionActive ? t('activationsCaption') : sessionCaption}
            onPress={() => onOpen('activations')}
          />
        </View>
        <View style={styles.gridRow}>
          <MetricTile
            icon="arrowOutward"
            tint={Colors.warning}
            label={t('outwardEvents')}
            value={sessionActive ? `${live.outward}` : dash}
            valueColor={
              !sessionActive
                ? Colors.textTertiary
                : live.outward > 0
                ? Colors.warning
                : Colors.textPrimary
            }
            caption={sessionActive ? t('outwardCaption') : sessionCaption}
            onPress={() => onOpen('outward')}
          />
          <View style={styles.gridGap} />
          <MetricTile
            icon="footprints"
            tint={Colors.accent}
            label={t('steps')}
            value={
              sessionActive && live.steps !== null ? `${live.steps}` : dash
            }
            valueColor={
              sessionActive && live.steps !== null
                ? Colors.textPrimary
                : Colors.textTertiary
            }
            caption={stepsCaption}
            onPress={() => onOpen('steps')}
          />
        </View>
        <View style={styles.gridRow}>
          <MetricTile
            icon="timer"
            tint={Colors.primary}
            label={t('correctionLatency')}
            value={
              sessionActive && live.correction > 0 ? `${live.correction}` : dash
            }
            unit={sessionActive && live.correction > 0 ? 'ms' : undefined}
            valueColor={
              sessionActive ? Colors.textPrimary : Colors.textTertiary
            }
            caption={sessionActive ? t('correctionCaption') : sessionCaption}
            onPress={() => onOpen('correction')}
          />
          <View style={styles.gridGap} />
          <MetricTile
            icon="peak"
            tint={Colors.danger}
            label={t('peakTilt')}
            value={sessionActive ? formatAngle(live.peak) : dash}
            valueColor={
              sessionActive ? Colors.textPrimary : Colors.textTertiary
            }
            caption={sessionActive ? t('peakCaption') : sessionCaption}
            onPress={() => onOpen('peak')}
          />
        </View>
      </View>
    );
  },
);

const GettingStarted = React.memo(() => {
  const t = useT();
  const steps = [t('step1'), t('step2'), t('step3')];
  return (
    <Card>
      {steps.map((step, index) => (
        <View
          key={step}
          style={[styles.step, index < steps.length - 1 && styles.stepDivider]}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </Card>
  );
});

export const HomeScreen = ({onOpenHistory}: {onOpenHistory: () => void}) => {
  const t = useT();
  const language = useLanguage();
  const dataStatus = useDataStatus();
  const sessionStatus = useSessionStore(state => state.status);

  const [metricKey, setMetricKey] = useState<MetricKey>('stability');
  const [metricOpen, setMetricOpen] = useState(false);
  const [summary, setSummary] = useState<SessionRecord | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const openMetric = useCallback((key: MetricKey) => {
    setMetricKey(key);
    setMetricOpen(true);
  }, []);

  const onFinished = useCallback((record: SessionRecord | null) => {
    if (record) {
      setSummary(record);
      setSummaryOpen(true);
    }
  }, []);

  const showHero = dataStatus === 'offline' && sessionStatus === 'idle';
  const sessionActive = sessionStatus !== 'idle';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          overline={formatWeekdayDate(Date.now(), language)}
          title={t('liveTitle')}
          right={<StatusPill status={dataStatus} />}
        />

        {showHero ? (
          <>
            <ConnectHero />
            <SectionHeader title={t('gettingStarted')} />
            <GettingStarted />
          </>
        ) : (
          <>
            <ConnectionStrip dataStatus={dataStatus} />
            <GaugeCard dataStatus={dataStatus} />
            <View style={styles.spacer} />
            <SessionCard
              canStart={hasLiveData(dataStatus)}
              onFinished={onFinished}
            />

            <SectionHeader
              title={t('metricsTitle')}
              right={
                <Text style={styles.sectionLink} onPress={onOpenHistory}>
                  {t('viewHistory')}
                </Text>
              }
            />
            <MetricsGrid sessionActive={sessionActive} onOpen={openMetric} />

            <SectionHeader title={t('trendTitle')} />
            <TrendCard />
          </>
        )}
      </ScrollView>

      <MetricSheet
        metric={metricKey}
        visible={metricOpen}
        sessionActive={sessionActive}
        onClose={() => setMetricOpen(false)}
      />
      <SessionSummarySheet
        record={summary}
        visible={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        footer={
          <Button label={t('done')} onPress={() => setSummaryOpen(false)} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  spacer: {
    height: 16,
  },
  gaugeCard: {
    paddingBottom: 22,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  overline: {
    ...Typography.overline,
    color: Colors.textSecondary,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zeroButton: {
    marginLeft: 10,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  zeroPressed: {
    opacity: 0.6,
  },
  zeroText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardHint: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
  chartWrap: {
    marginHorizontal: -4,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 12,
    rowGap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  legendSwatch: {
    width: 14,
    height: 3,
    borderRadius: 2,
    marginRight: 6,
  },
  legendInward: {
    backgroundColor: Colors.danger,
    opacity: 0.7,
  },
  legendOutward: {
    backgroundColor: Colors.warning,
    opacity: 0.7,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  gridGap: {
    width: 12,
  },
  sectionLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  stepDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderStrong,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepNumberText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  stepText: {
    ...Typography.body,
    color: Colors.textSecondary,
    flex: 1,
  },
});
