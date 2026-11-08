import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {bleService} from '../ble/bleService';
import {SENSOR_SERVICE_UUID} from '../ble/protocol';
import {Button} from '../components/Button';
import {issueText} from '../components/ConnectionCard';
import {Card} from '../components/Card';
import {Icon, IconName} from '../components/Icon';
import {PulseDot} from '../components/PulseDot';
import {ScreenHeader} from '../components/ScreenHeader';
import {SectionHeader} from '../components/SectionHeader';
import {Colors} from '../design/colors';
import {Radius, TAB_BAR_CLEARANCE} from '../design/spacing';
import {Typography} from '../design/typography';
import {useT} from '../hooks/useT';
import {Language} from '../i18n/translations';
import {useConnectionStore} from '../store/connectionStore';
import {useHistoryStore} from '../store/historyStore';
import {useLanguageStore} from '../store/languageStore';
import {useLiveStore} from '../store/liveStore';
import {syncService} from '../sync/syncService';
import {SyncError, normalizeServerUrl, useSyncStore} from '../sync/syncStore';
import {formatRelativeDay, formatTime} from '../utils/format';
import {TranslationKey} from '../i18n/translations';
import {
  OUTWARD_THRESHOLD_MAX,
  OUTWARD_THRESHOLD_MIN,
  THRESHOLD_MAX,
  THRESHOLD_MIN,
  useSettingsStore,
} from '../store/settingsStore';

const APP_VERSION: string = require('../../package.json').version;

const LANGUAGES: {code: Language; label: string}[] = [
  {code: 'hu', label: 'Magyar'},
  {code: 'en', label: 'English'},
  {code: 'de', label: 'Deutsch'},
];

const Row = ({
  icon,
  tint = Colors.textSecondary,
  title,
  subtitle,
  right,
  last,
}: {
  icon: IconName;
  tint?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  last?: boolean;
}) => (
  <View style={[styles.row, !last && styles.rowDivider]}>
    <View style={[styles.rowIcon, {backgroundColor: `${tint}24`}]}>
      <Icon name={icon} size={17} color={tint} />
    </View>
    <View style={styles.rowTexts}>
      <Text style={styles.rowTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
    </View>
    {right}
  </View>
);

const Stepper = ({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) => (
  <View style={styles.stepper}>
    <Pressable
      onPress={() => onChange(value - 1)}
      disabled={value <= min}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="-"
      style={({pressed}) => [
        styles.stepperButton,
        pressed && styles.pressed,
        value <= min && styles.disabled,
      ]}>
      <Icon
        name="minus"
        size={16}
        color={Colors.textPrimary}
        strokeWidth={2.4}
      />
    </Pressable>
    <Text style={styles.stepperValue}>{value}°</Text>
    <Pressable
      onPress={() => onChange(value + 1)}
      disabled={value >= max}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="+"
      style={({pressed}) => [
        styles.stepperButton,
        pressed && styles.pressed,
        value >= max && styles.disabled,
      ]}>
      <Icon
        name="plus"
        size={16}
        color={Colors.textPrimary}
        strokeWidth={2.4}
      />
    </Pressable>
  </View>
);

const ActionLink = ({
  label,
  doneLabel,
  onPress,
}: {
  label: string;
  doneLabel: string;
  onPress: () => Promise<boolean>;
}) => {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const handlePress = async () => {
    setState('busy');
    const ok = await onPress();
    if (!mounted.current) {
      return;
    }
    setState(ok ? 'done' : 'idle');
    if (ok) {
      setTimeout(() => mounted.current && setState('idle'), 1800);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={state !== 'idle'}
      hitSlop={8}
      accessibilityRole="button"
      style={({pressed}) => [styles.actionLink, pressed && styles.pressed]}>
      <Text
        style={[
          styles.actionLinkText,
          state === 'done' && styles.actionLinkDone,
        ]}>
        {state === 'done' ? doneLabel : label}
      </Text>
    </Pressable>
  );
};

const syncErrorText: Record<SyncError, TranslationKey> = {
  noServer: 'syncErrorNoServer',
  unreachable: 'syncErrorUnreachable',
  server: 'syncErrorServer',
};

const CloudSyncCard = () => {
  const t = useT();
  const language = useLanguageStore(state => state.language);
  const sync = useSyncStore();
  const pending = useHistoryStore(
    state => state.sessions.filter(s => !s.syncedAt).length,
  );
  const [draft, setDraft] = useState(sync.serverUrl);
  useEffect(() => setDraft(sync.serverUrl), [sync.serverUrl]);

  const commit = () => sync.setServerUrl(draft);

  const status = sync.syncing
    ? t('syncing')
    : sync.lastError
    ? t(syncErrorText[sync.lastError])
    : sync.lastSyncAt
    ? t('syncLast', {
        time: `${formatRelativeDay(sync.lastSyncAt, language)} ${formatTime(
          sync.lastSyncAt,
        )}`,
      })
    : t('syncNever');

  return (
    <Card padded={false}>
      <Row
        icon="cloud"
        tint={Colors.primary}
        title={t('cloudSync')}
        subtitle={t('cloudSyncHint')}
        right={
          <Switch
            value={sync.enabled}
            onValueChange={sync.setEnabled}
            {...switchColors}
          />
        }
        last={!sync.enabled}
      />
      {sync.enabled && (
        <>
          <View style={[styles.inputRow, styles.rowDivider]}>
            <Text style={styles.inputLabel}>{t('serverUrl')}</Text>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              onEndEditing={commit}
              onSubmitEditing={commit}
              placeholder={t('serverUrlPlaceholder')}
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              accessibilityLabel={t('serverUrl')}
            />
          </View>
          <Row
            icon="refresh"
            tint={sync.lastError ? Colors.warning : Colors.textSecondary}
            title={status}
            subtitle={
              pending > 0
                ? t('syncPending', {count: pending})
                : t('deviceId', {id: sync.userId.slice(0, 8)})
            }
            right={
              <ActionLink
                label={t('syncNow')}
                doneLabel={t('calibrated')}
                onPress={() => {
                  if (normalizeServerUrl(draft) !== sync.serverUrl) {
                    commit();
                  }
                  return syncService.syncNow();
                }}
              />
            }
            last
          />
        </>
      )}
    </Card>
  );
};

const switchColors = {
  trackColor: {false: Colors.surfaceHighlight, true: Colors.accent},
  thumbColor: '#FFFFFF',
  ios_backgroundColor: Colors.surfaceHighlight,
};

export const SettingsScreen = () => {
  const t = useT();
  const language = useLanguageStore(state => state.language);
  const setLanguage = useLanguageStore(state => state.setLanguage);
  const settings = useSettingsStore();
  const connection = useConnectionStore();
  const battery = useLiveStore(state =>
    state.source === 'ble' ? state.battery : null,
  );
  const sessionCount = useHistoryStore(state => state.sessions.length);
  const clearHistory = useHistoryStore(state => state.clear);

  const connected = connection.status === 'connected';
  const busy = !connected && connection.status !== 'idle';

  const statusLabel = connected
    ? t('statusConnected')
    : busy
    ? t(
        connection.status === 'reconnecting'
          ? 'statusReconnecting'
          : 'statusConnecting',
      )
    : t('statusNotConnected');

  const confirmClear = () =>
    Alert.alert(t('clearHistoryTitle'), t('clearHistoryBody'), [
      {text: t('cancel'), style: 'cancel'},
      {text: t('delete'), style: 'destructive', onPress: clearHistory},
    ]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('settingsTitle')} />

        <SectionHeader title={t('sectionDevice')} />
        <Card padded={false}>
          <Row
            icon="bluetooth"
            tint={connected ? Colors.accent : Colors.textSecondary}
            title={
              connected ? connection.deviceName ?? t('sensor') : t('sensor')
            }
            subtitle={
              connected && battery !== null
                ? `${statusLabel} · ${t('batteryValue', {value: battery})}`
                : !connected && !busy && connection.issue
                ? t(issueText[connection.issue])
                : statusLabel
            }
            right={
              <PulseDot
                color={
                  connected
                    ? Colors.accent
                    : busy
                    ? Colors.primary
                    : Colors.textTertiary
                }
                active={connected || busy}
              />
            }
          />
          <Row
            icon="refresh"
            title={t('autoReconnect')}
            subtitle={t('autoReconnectHint')}
            right={
              <Switch
                value={settings.autoReconnect}
                onValueChange={settings.setAutoReconnect}
                {...switchColors}
              />
            }
            last
          />
          <View style={styles.cardAction}>
            {connected || busy ? (
              <Button
                label={busy ? t('cancel') : t('disconnect')}
                variant="secondary"
                onPress={() => bleService.disconnect()}
              />
            ) : (
              <Button
                label={t('connectDevice')}
                icon="bluetooth"
                onPress={() => bleService.connect()}
              />
            )}
          </View>
        </Card>

        {connected && (
          <>
            <SectionHeader title={t('sensor')} />
            {connection.controlSupported ? (
              <Card padded={false}>
                {connection.controlPairingFailed && (
                  <Row
                    icon="alert"
                    tint={Colors.warning}
                    title={t('pairingFailed')}
                    right={
                      <ActionLink
                        label={t('retryAction')}
                        doneLabel={t('calibrated')}
                        onPress={async () => {
                          await bleService.retryControlSync();
                          return !useConnectionStore.getState()
                            .controlPairingFailed;
                        }}
                      />
                    }
                  />
                )}
                <Row
                  icon="zap"
                  tint={Colors.violet}
                  title={t('vibrationFeedback')}
                  subtitle={t('vibrationFeedbackHint')}
                  right={
                    <Switch
                      value={settings.vibrationFeedback}
                      onValueChange={settings.setVibrationFeedback}
                      {...switchColors}
                    />
                  }
                />
                <Row
                  icon="target"
                  tint={Colors.accent}
                  title={t('calibrate')}
                  subtitle={t('calibrateHint')}
                  right={
                    <ActionLink
                      label={t('calibrateAction')}
                      doneLabel={t('calibrated')}
                      onPress={() => bleService.calibrate()}
                    />
                  }
                />
                <Row
                  icon="refresh"
                  title={t('invertTilt')}
                  subtitle={t('invertTiltHint')}
                  right={
                    <Switch
                      value={settings.invertTilt}
                      onValueChange={settings.setInvertTilt}
                      {...switchColors}
                    />
                  }
                />
                <Row
                  icon="sliders"
                  title={t('swapAxes')}
                  subtitle={t('swapAxesHint')}
                  right={
                    <Switch
                      value={settings.swapAxes}
                      onValueChange={settings.setSwapAxes}
                      {...switchColors}
                    />
                  }
                />
                <Row
                  icon="activity"
                  title={t('testVibration')}
                  right={
                    <ActionLink
                      label={t('testAction')}
                      doneLabel={t('calibrated')}
                      onPress={() => bleService.testVibration()}
                    />
                  }
                  last
                />
              </Card>
            ) : (
              <Card>
                <Text style={styles.rowSubtitle}>{t('firmwareOutdated')}</Text>
              </Card>
            )}
          </>
        )}

        <SectionHeader title={t('sectionMeasurement')} />
        <Card padded={false}>
          <Row
            icon="arrowInward"
            tint={Colors.danger}
            title={t('inwardThreshold')}
            subtitle={t('thresholdHint')}
            right={
              <Stepper
                value={settings.inwardThreshold}
                onChange={settings.setInwardThreshold}
                min={THRESHOLD_MIN}
                max={THRESHOLD_MAX}
              />
            }
          />
          <Row
            icon="arrowOutward"
            tint={Colors.warning}
            title={t('outwardThreshold')}
            subtitle={t('outwardThresholdHint')}
            right={
              <Stepper
                value={settings.outwardThreshold}
                onChange={settings.setOutwardThreshold}
                min={OUTWARD_THRESHOLD_MIN}
                max={OUTWARD_THRESHOLD_MAX}
              />
            }
          />
          <Row
            icon="sliders"
            title={t('keepScreenOn')}
            subtitle={t('keepScreenOnHint')}
            right={
              <Switch
                value={settings.keepScreenOn}
                onValueChange={settings.setKeepScreenOn}
                {...switchColors}
              />
            }
          />
          <Row
            icon="sparkles"
            tint={Colors.violet}
            title={t('demoMode')}
            subtitle={t('demoModeHint')}
            right={
              <Switch
                value={settings.demoMode}
                onValueChange={settings.setDemoMode}
                {...switchColors}
              />
            }
            last
          />
        </Card>

        <SectionHeader title={t('language')} />
        <View style={styles.segment}>
          {LANGUAGES.map(option => {
            const active = option.code === language;
            return (
              <Pressable
                key={option.code}
                onPress={() => setLanguage(option.code)}
                accessibilityRole="button"
                accessibilityState={{selected: active}}
                style={[
                  styles.segmentItem,
                  active && styles.segmentItemActive,
                ]}>
                <Text
                  style={[
                    styles.segmentText,
                    active && styles.segmentTextActive,
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SectionHeader title={t('sectionData')} />
        <Card padded={false}>
          <Row
            icon="clock"
            title={t('savedSessions')}
            subtitle={t(
              sessionCount === 1 ? 'sessionsCountOne' : 'sessionsCount',
              {count: sessionCount},
            )}
            right={
              <Pressable
                onPress={confirmClear}
                disabled={sessionCount === 0}
                hitSlop={8}
                accessibilityRole="button"
                style={({pressed}) => [
                  pressed && styles.pressed,
                  sessionCount === 0 && styles.disabled,
                ]}>
                <Text style={styles.destructive}>{t('clear')}</Text>
              </Pressable>
            }
            last
          />
        </Card>

        <SectionHeader title={t('sectionCloud')} />
        <CloudSyncCard />

        <SectionHeader title={t('sectionAbout')} />
        <Card padded={false}>
          <Row
            icon="info"
            title="Ashi"
            subtitle={t('versionValue', {value: APP_VERSION})}
          />
          <Row
            icon="activity"
            title={t('sensorProtocol')}
            subtitle={`${t('serviceUuid')} ${SENSOR_SERVICE_UUID.slice(0, 8)}…`}
            last
          />
        </Card>
      </ScrollView>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderStrong,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTexts: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  rowSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  inputRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    color: Colors.textPrimary,
    fontSize: 15,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardAction: {
    padding: 16,
    paddingTop: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: 4,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderStrong,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: Colors.surfaceHighlight,
  },
  segmentText: {
    ...Typography.caption,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  actionLink: {
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionLinkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  actionLinkDone: {
    color: Colors.accent,
  },
  destructive: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.35,
  },
});
