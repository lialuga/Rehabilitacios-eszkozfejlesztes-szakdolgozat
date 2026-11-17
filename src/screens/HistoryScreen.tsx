import React, {useMemo, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Button} from '../components/Button';
import {Card} from '../components/Card';
import {Icon} from '../components/Icon';
import {LineChart} from '../components/LineChart';
import {ScreenHeader} from '../components/ScreenHeader';
import {SectionHeader} from '../components/SectionHeader';
import {SessionSummarySheet} from '../components/SessionSummarySheet';
import {Colors} from '../design/colors';
import {Radius, TAB_BAR_CLEARANCE} from '../design/spacing';
import {Typography} from '../design/typography';
import {useLanguage, useT} from '../hooks/useT';
import {SessionRecord, useHistoryStore} from '../store/historyStore';
import {
  formatDuration,
  formatRelativeDay,
  formatTime,
  formatTotalTime,
} from '../utils/format';
import {scoreColor} from '../utils/metrics';

const TREND_SESSIONS = 12;

const SessionRow = ({
  record,
  onPress,
}: {
  record: SessionRecord;
  onPress: () => void;
}) => {
  const t = useT();
  const language = useLanguage();
  const color = scoreColor(record.balance);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({pressed}) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.score, {borderColor: color}]}>
        <Text style={[styles.scoreText, {color}]}>{record.balance}</Text>
      </View>
      <View style={styles.rowTexts}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>
            {formatRelativeDay(record.startedAt, language)} ·{' '}
            {formatTime(record.startedAt)}
          </Text>
          {record.source === 'demo' && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoText}>{t('demoBadge')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowSubtitle}>
          {formatDuration(record.durationMs)} ·{' '}
          {t('stabilityShort', {value: record.avgStability})} ·{' '}
          {t('inwardShort', {value: record.inwardPercent})}
        </Text>
      </View>
      <Icon name="chevronRight" size={18} color={Colors.textTertiary} />
    </Pressable>
  );
};

export const HistoryScreen = () => {
  const t = useT();
  const language = useLanguage();
  const sessions = useHistoryStore(state => state.sessions);
  const removeSession = useHistoryStore(state => state.removeSession);

  const [selected, setSelected] = useState<SessionRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const overview = useMemo(() => {
    const totalMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
    const avgStability = sessions.length
      ? Math.round(
          sessions.reduce((sum, s) => sum + s.avgStability, 0) /
            sessions.length,
        )
      : 0;
    const trend = sessions
      .slice(0, TREND_SESSIONS)
      .map(s => s.balance)
      .reverse();
    return {totalMs, avgStability, trend};
  }, [sessions]);

  const open = (record: SessionRecord) => {
    setSelected(record);
    setSheetOpen(true);
  };

  const confirmDelete = () => {
    if (!selected) {
      return;
    }
    Alert.alert(t('deleteSessionTitle'), t('deleteSessionBody'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          removeSession(selected.id);
          setSheetOpen(false);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          overline={t(
            sessions.length === 1 ? 'sessionsCountOne' : 'sessionsCount',
            {count: sessions.length},
          )}
          title={t('historyTitle')}
        />

        {sessions.length === 0 ? (
          <Card style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="clock" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{t('historyEmptyTitle')}</Text>
            <Text style={styles.emptyBody}>{t('historyEmptyBody')}</Text>
          </Card>
        ) : (
          <>
            <Card>
              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewValue}>{sessions.length}</Text>
                  <Text style={styles.overviewLabel}>{t('sessionsLabel')}</Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewValue}>
                    {formatTotalTime(overview.totalMs, language)}
                  </Text>
                  <Text style={styles.overviewLabel}>{t('totalTime')}</Text>
                </View>
                <View style={styles.overviewDivider} />
                <View style={styles.overviewItem}>
                  <Text
                    style={[
                      styles.overviewValue,
                      {color: scoreColor(overview.avgStability)},
                    ]}>
                    {overview.avgStability}%
                  </Text>
                  <Text style={styles.overviewLabel}>{t('avgStability')}</Text>
                </View>
              </View>

              {overview.trend.length >= 2 && (
                <View style={styles.trend}>
                  <Text style={styles.trendTitle}>
                    {t('balanceTrend', {count: overview.trend.length})}
                  </Text>
                  <LineChart
                    data={overview.trend}
                    color={Colors.accent}
                    height={110}
                    min={0}
                    max={100}
                    formatLabel={v => `${Math.round(v)}`}
                  />
                </View>
              )}
            </Card>

            <SectionHeader title={t('sessionsLabel')} />
            <Card padded={false}>
              {sessions.map((record, index) => (
                <View
                  key={record.id}
                  style={index < sessions.length - 1 && styles.rowDivider}>
                  <SessionRow record={record} onPress={() => open(record)} />
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>

      <SessionSummarySheet
        record={selected}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        footer={
          <Button
            label={t('deleteSession')}
            variant="danger"
            icon="trash"
            onPress={confirmDelete}
          />
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
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: Colors.borderStrong,
  },
  overviewValue: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  overviewLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  trend: {
    marginTop: 20,
  },
  trendTitle: {
    ...Typography.overline,
    color: Colors.textTertiary,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: {
    backgroundColor: Colors.surfaceElevated,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderStrong,
  },
  score: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rowTexts: {
    flex: 1,
    marginRight: 8,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  demoBadge: {
    backgroundColor: Colors.violetSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
  },
  demoText: {
    color: Colors.violet,
    fontSize: 10,
    fontWeight: '700',
  },
});
